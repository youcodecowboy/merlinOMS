import { Metadata } from "next"
import { QualityCheckClient } from "./quality-check-client"

export const metadata: Metadata = {
  title: "Quality Check",
  description: "Manage and track quality control requests",
}

export default function QualityCheckPage() {
  return <QualityCheckClient />
} 