import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'
import QRCode from 'qrcode'
import PDFDocument from 'pdfkit'
import { Prisma } from '@prisma/client'

export async function POST(req: Request) {
  try {
    const { requestIds, quantity } = await req.json()

    if (!requestIds?.length || !quantity) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Get all requests and validate they're for the same SKU
      const requests = await tx.productionRequest.findMany({
        where: {
          id: { in: requestIds },
          status: 'PENDING'
        }
      })

      if (requests.length !== requestIds.length) {
        throw new Error('One or more requests not found or not in PENDING status')
      }

      const skus = new Set(requests.map(r => r.sku))
      if (skus.size !== 1) {
        throw new Error('All requests must be for the same SKU')
      }

      const sku = requests[0].sku
      const totalRequestedQuantity = requests.reduce((sum: number, r) => sum + r.quantity, 0)
      
      if (quantity < totalRequestedQuantity) {
        throw new Error('Batch quantity cannot be less than total requested quantity')
      }

      // 2. Create the production batch
      const batch = await tx.productionBatch.create({
        data: {
          id: `PB-${nanoid(8)}`,
          sku,
          quantity,
          status: 'PENDING',
          requests: {
            connect: requests.map(r => ({ id: r.id }))
          }
        }
      })

      // 3. Generate QR codes and create inventory items
      const items = await Promise.all(
        Array.from({ length: quantity }).map(async (_, i) => {
          const itemId = `${batch.id}-${String(i + 1).padStart(3, '0')}`
          const qrCode = await QRCode.toDataURL(itemId)
          
          return tx.inventoryItem.create({
            data: {
              id: itemId,
              sku,
              status1: 'PRODUCTION',
              status2: 'UNCOMMITTED',
              qrCode,
              batchId: batch.id,
              metadata: {
                create: {
                  productionBatchId: batch.id,
                  position: i + 1
                }
              }
            }
          })
        })
      )

      // 4. Create pattern request
      const patternRequest = await tx.patternRequest.create({
        data: {
          id: `PR-${nanoid(8)}`,
          batchId: batch.id,
          sku,
          quantity,
          status: 'PENDING'
        }
      })

      // 5. Generate PDF with QR codes
      const doc = new PDFDocument()
      const chunks: Uint8Array[] = []
      
      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk))
      
      // Add batch info
      doc.fontSize(20).text(`Production Batch: ${batch.id}`, { align: 'center' })
      doc.fontSize(14).text(`SKU: ${sku}`, { align: 'center' })
      doc.fontSize(14).text(`Quantity: ${quantity}`, { align: 'center' })
      doc.moveDown()

      // Add QR codes in a grid
      const codesPerRow = 4
      const qrSize = 120
      const margin = 20
      let x = margin
      let y = doc.y + margin

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        
        // Add QR code
        doc.image(item.qrCode, x, y, { width: qrSize })
        
        // Add item ID below QR code
        doc.fontSize(10).text(item.id, x, y + qrSize + 5, {
          width: qrSize,
          align: 'center'
        })

        // Move to next position
        x += qrSize + margin
        if ((i + 1) % codesPerRow === 0) {
          x = margin
          y += qrSize + margin + 20 // Extra 20 for item ID text
        }

        // New page if needed
        if (y > doc.page.height - (qrSize + margin + 20)) {
          doc.addPage()
          x = margin
          y = margin
        }
      }

      doc.end()

      // Convert buffers to base64
      const pdfBuffer = Buffer.concat(chunks)
      const pdfBase64 = pdfBuffer.toString('base64')

      // Update batch with PDF
      await tx.productionBatch.update({
        where: { id: batch.id },
        data: {
          qrCodesPdf: pdfBase64
        }
      })

      // 6. Update request statuses
      await tx.productionRequest.updateMany({
        where: { id: { in: requestIds } },
        data: { status: 'IN_PROGRESS' }
      })

      return {
        batchId: batch.id,
        patternRequestId: patternRequest.id,
        itemCount: items.length,
        pdf: pdfBase64
      }
    })

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Error creating production batch:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create production batch'
    }, { status: 500 })
  }
} 