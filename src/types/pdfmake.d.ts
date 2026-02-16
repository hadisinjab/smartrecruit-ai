declare module 'pdfmake/build/pdfmake' {
  interface TDocumentDefinitions {
    content: any[];
    pageSize?: string;
    pageOrientation?: 'portrait' | 'landscape';
    styles?: any;
    defaultStyle?: any;
    footer?: (currentPage: number, pageCount: number) => any;
  }

  interface PdfMake {
    vfs: any;
    createPdf: (docDefinition: TDocumentDefinitions) => {
      download: (filename: string) => void;
      open: () => void;
      print: () => void;
      getBlob: (callback: (blob: Blob) => void) => void;
      getDataUrl: (callback: (dataUrl: string) => void) => void;
    };
  }

  const pdfMake: PdfMake;
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const pdfFonts: {
    pdfMake: {
      vfs: any;
    };
  };
  export = pdfFonts;
}

