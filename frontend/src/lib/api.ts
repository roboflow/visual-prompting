import { Box, Datum } from "./types";

export async function train(data: Datum[]): Promise<string> {
    // returns the model uuid
    return "1234-5678-9012-3456";
}

export async function infer(model: string, image: File): Promise<Box[]> {
    // returns the bounding boxes
    return [];
}