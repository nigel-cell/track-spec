import { loadForzaGarageList, findGarageCar } from "./forzaGarage";

export type CarPhotoStatus = "idle" | "loading" | "loaded" | "error";

/** Resolve hero image from imported Forza Garage data */
export async function fetchCarPhoto(make: string, model: string): Promise<string | null> {
  try {
    const db = await loadForzaGarageList();
    const car = findGarageCar(db.cars, make, model);
    return car?.image ?? null;
  } catch {
    return null;
  }
}
