import { PrismaClient } from "@prisma/client";

export async function seedTransit(prisma: PrismaClient) {
  console.log("Seeding Transit Infrastructure...");

  const omrRouteGeo = [
    [13.0069, 80.2443], // Madhya Kailash
    [12.9896, 80.2483], // Tidel Park
    [12.9800, 80.2480], // SRP Tools
    [12.9660, 80.2450], // Perungudi
    [12.9400, 80.2370], // Thoraipakkam
    [12.9160, 80.2300], // Karapakkam
    [12.8980, 80.2270]  // Sholinganallur
  ];

  const omrStops = [
    { code: "ST-MK", name: "Madhya Kailash", lat: 13.0069, lng: 80.2443 },
    { code: "ST-TP", name: "Tidel Park", lat: 12.9896, lng: 80.2483 },
    { code: "ST-SRP", name: "SRP Tools", lat: 12.9800, lng: 80.2480 },
    { code: "ST-PER", name: "Perungudi", lat: 12.9660, lng: 80.2450 },
    { code: "ST-THO", name: "Thoraipakkam", lat: 12.9400, lng: 80.2370 },
    { code: "ST-KAR", name: "Karapakkam", lat: 12.9160, lng: 80.2300 },
    { code: "ST-SHO", name: "Sholinganallur", lat: 12.8980, lng: 80.2270 },
  ];

  const guindyRouteGeo = [
    [13.0100, 80.2160], // Guindy
    [13.0150, 80.2230], // Little Mount
    [13.0210, 80.2260], // Saidapet
    [13.0310, 80.2330], // Nandanam
    [13.0390, 80.2330], // Teynampet
    [13.0400, 80.2300]  // T. Nagar (Panagal Park approx)
  ];

  const guindyStops = [
    { code: "ST-GUI", name: "Guindy", lat: 13.0100, lng: 80.2160 },
    { code: "ST-LMO", name: "Little Mount", lat: 13.0150, lng: 80.2230 },
    { code: "ST-SAI", name: "Saidapet", lat: 13.0210, lng: 80.2260 },
    { code: "ST-NAN", name: "Nandanam", lat: 13.0310, lng: 80.2330 },
    { code: "ST-TEY", name: "Teynampet", lat: 13.0390, lng: 80.2330 },
    { code: "ST-TNA", name: "T. Nagar", lat: 13.0400, lng: 80.2300 },
  ];

  async function createRouteWithStops(routeCode: string, name: string, origin: string, destination: string, polyline: any, stops: any[]) {
    const route = await prisma.transitRoute.upsert({
      where: { routeCode },
      update: { name, origin, destination, polyline: JSON.stringify(polyline), distanceKm: 15 },
      create: { routeCode, name, origin, destination, polyline: JSON.stringify(polyline), distanceKm: 15, activeVehicles: 3 }
    });

    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      const dbStop = await prisma.transitStop.upsert({
        where: { stopCode: stop.code },
        update: { name: stop.name, lat: stop.lat, lng: stop.lng },
        create: { stopCode: stop.code, name: stop.name, lat: stop.lat, lng: stop.lng }
      });

      // Link to CityAsset
      await prisma.cityAsset.upsert({
        where: { assetCode: `CA-${stop.code}` },
        update: { lat: stop.lat, lng: stop.lng, name: `${stop.name} Transit Stop`, refId: dbStop.id },
        create: {
          assetCode: `CA-${stop.code}`,
          name: `${stop.name} Transit Stop`,
          assetType: "TransitStop",
          category: "MOBILITY",
          lat: stop.lat,
          lng: stop.lng,
          refType: "TransitStop",
          refId: dbStop.id,
          isDemo: true
        }
      });

      await prisma.transitRouteStop.upsert({
        where: { routeId_stopIndex: { routeId: route.id, stopIndex: i } },
        update: { stopId: dbStop.id },
        create: { routeId: route.id, stopId: dbStop.id, stopIndex: i }
      });
    }

    return route;
  }

  const omrRoute = await createRouteWithStops("R-OMR-1", "OMR Express", "Madhya Kailash", "Sholinganallur", omrRouteGeo, omrStops);
  const guindyRoute = await createRouteWithStops("R-GUI-1", "Guindy - T.Nagar", "Guindy", "T. Nagar", guindyRouteGeo, guindyStops);

  // Add a few vehicles
  const vehicles = [
    { code: "BUS-OMR-01", routeId: omrRoute.id, lat: omrStops[0].lat, lng: omrStops[0].lng, nextStopId: omrStops[1].code },
    { code: "BUS-OMR-02", routeId: omrRoute.id, lat: omrStops[3].lat, lng: omrStops[3].lng, nextStopId: omrStops[4].code },
    { code: "BUS-GUI-01", routeId: guindyRoute.id, lat: guindyStops[0].lat, lng: guindyStops[0].lng, nextStopId: guindyStops[1].code },
    { code: "BUS-GUI-02", routeId: guindyRoute.id, lat: guindyStops[2].lat, lng: guindyStops[2].lng, nextStopId: guindyStops[3].code },
  ];

  for (const v of vehicles) {
    const nextStopDb = await prisma.transitStop.findUnique({ where: { stopCode: v.nextStopId } });
    
    const dbVehicle = await prisma.transitVehicle.upsert({
      where: { vehicleCode: v.code },
      update: { lat: v.lat, lng: v.lng, routeId: v.routeId, nextStopId: nextStopDb?.id },
      create: { vehicleCode: v.code, lat: v.lat, lng: v.lng, routeId: v.routeId, nextStopId: nextStopDb?.id, status: "MOVING", speed: 20 }
    });

    await prisma.cityAsset.upsert({
      where: { assetCode: `CA-${v.code}` },
      update: { lat: v.lat, lng: v.lng, name: `Bus ${v.code}`, refId: dbVehicle.id },
      create: {
        assetCode: `CA-${v.code}`,
        name: `Bus ${v.code}`,
        assetType: "TransitVehicle",
        category: "MOBILITY",
        lat: v.lat,
        lng: v.lng,
        refType: "TransitVehicle",
        refId: dbVehicle.id,
        isDemo: true
      }
    });
  }

  console.log("Transit Seeding Completed.");
}
