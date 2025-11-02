
// lib/server/prisma.ts

import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

// Define the type for the extended Prisma Client with Accelerate
const prismaClientSingleton = () => {
  return new PrismaClient().$extends(withAccelerate());
};

// Use a utility type to infer the exact type of the extended client
type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

// Augment the global object to hold the Prisma client instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

// Check if a global instance already exists, otherwise create a new one
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// In development environments, attach the instance to the global object
// so that hot reloading doesn't create new instances.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Export the singleton instance
export default prisma;
