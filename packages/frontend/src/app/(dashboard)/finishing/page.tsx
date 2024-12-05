import { Metadata } from "next"
import { FinishingClient } from "./finishing-client"

export const metadata: Metadata = {
  title: "Finishing",
  description: "Manage and track finishing requests",
}

export default function FinishingPage() {
  return <FinishingClient />
} 