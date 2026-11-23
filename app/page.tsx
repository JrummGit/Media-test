import { getCatalog } from "@/lib/catalog";
import { ShopFloorView } from "@/components/views/ShopFloorView";

export default async function ShopFloor() {
  return <ShopFloorView catalog={await getCatalog()} />;
}
