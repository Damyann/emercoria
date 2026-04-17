export type GeoOverlayRegion = {
  id: string;
  fileName: string;
  name: string;
  iso: string | null;
  group: string | null;
  shapeType: string | null;
  polygons: Array<Array<[number, number]>>;
};
