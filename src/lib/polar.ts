
import { env } from "./env";
import { Polar } from "@polar-sh/sdk";

export const polar = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: env.POLAR_SERVER,
});