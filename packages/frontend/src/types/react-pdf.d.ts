declare module '@react-pdf/renderer' {
  import { FC, ReactNode } from 'react'

  interface StyleSheet {
    create: <T extends { [key: string]: any }>(styles: T) => T
  }

  interface DocumentProps {
    children?: ReactNode
  }

  interface PageProps {
    size?: string
    style?: any
    children?: ReactNode
  }

  interface ViewProps {
    style?: any
    children?: ReactNode
  }

  interface TextProps {
    style?: any
    children?: ReactNode
  }

  interface PDFViewerProps {
    className?: string
    children?: ReactNode
  }

  export const Document: FC<DocumentProps>
  export const Page: FC<PageProps>
  export const View: FC<ViewProps>
  export const Text: FC<TextProps>
  export const PDFViewer: FC<PDFViewerProps>
  export const StyleSheet: StyleSheet
} 