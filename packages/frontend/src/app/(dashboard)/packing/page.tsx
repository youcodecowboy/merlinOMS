import { Metadata } from "next"
import { PackingClient } from "./packing-client"

export const metadata: Metadata = {
  title: "Packing",
  description: "Manage and track packing requests",
}

export default function PackingPage() {
  return <PackingClient />
} 