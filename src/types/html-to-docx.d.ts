declare module "html-to-docx" {
  interface DocumentOptions {
    orientation?: "portrait" | "landscape";
    pageSize?: { width?: number; height?: number };
    margins?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
      header?: number;
      footer?: number;
      gutter?: number;
    };
    title?: string;
    creator?: string;
    font?: string;
    fontSize?: number;
    lang?: string;
  }

  export default function HTMLtoDOCX(
    htmlString: string,
    headerHTMLString?: string | null,
    documentOptions?: DocumentOptions,
    footerHTMLString?: string | null
  ): Promise<Buffer | Blob>;
}
