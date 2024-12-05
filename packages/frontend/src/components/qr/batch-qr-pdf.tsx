import { Document, Page, View, Text, StyleSheet, PDFViewer } from '@react-pdf/renderer'
import { QRCodeSVG } from 'qrcode.react'

interface BatchItem {
  id: string
  sku: string
  qr_code: string
  location?: string
  notes?: string
}

interface BatchQRPDFProps {
  items: BatchItem[]
  batchId: string
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  item: {
    marginBottom: 20,
    borderBottom: '1pt solid #e5e7eb',
    paddingBottom: 10,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  text: {
    fontSize: 12,
    marginBottom: 5,
  },
  header: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  info: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 5,
  },
})

export function BatchQRPDF({ items, batchId }: BatchQRPDFProps) {
  return (
    <PDFViewer className="w-full h-full min-h-[500px]">
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.header}>Batch QR Codes - {batchId}</Text>
          {items.map((item) => (
            <View key={item.id} style={styles.item}>
              <View style={styles.qrContainer}>
                <QRCodeSVG 
                  value={item.qr_code}
                  size={128}
                  level="H"
                  includeMargin
                />
              </View>
              <Text style={styles.text}>SKU: {item.sku}</Text>
              <Text style={styles.text}>ID: {item.id}</Text>
              {item.location && (
                <Text style={styles.info}>Location: {item.location}</Text>
              )}
              {item.notes && (
                <Text style={styles.info}>Notes: {item.notes}</Text>
              )}
            </View>
          ))}
        </Page>
      </Document>
    </PDFViewer>
  )
}

// Utility function to generate QR code value
export function generateQRValue(item: BatchItem): string {
  return JSON.stringify({
    id: item.id,
    sku: item.sku,
    qr: item.qr_code,
    type: 'INVENTORY_ITEM'
  })
} 