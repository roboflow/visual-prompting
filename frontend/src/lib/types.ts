export type Box = {
    class?: string,
    x: number,
    y: number,
    width: number,
    height: number,
    negative: boolean
}
  
export type Datum = {
    image: File,
    boxes: Box[]
}