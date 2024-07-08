export type Box = {
  cls?: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Datum = {
  image: File;
  boxes: Box[];
};
