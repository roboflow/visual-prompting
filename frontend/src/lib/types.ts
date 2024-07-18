export type Box = {
  cls?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  highlighted?: boolean;
};

export type Datum = {
  image: File;
  boxes: Box[];
};
