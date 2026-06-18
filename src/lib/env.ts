import {z} from "zod";
import {createEnv} from "@t3-oss/env-nextjs";

export const env = createEnv({
    server: {
        DATABASE_URL: z.string().min(1),
        APP_URL: z.string().min(1),
        R2_ACCOUNT_ID: z.string().min(1),
        R2_ACCESS_KEY_ID: z.string().min(1),
        R2_SECRET_ACCESS_KEY: z.string().min(1),
        R2_BUCKET_NAME: z.string().min(1),
    },
    experimental__runtimeEnv: {},
    skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})