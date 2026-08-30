import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { chatterbox } from "@/lib/chatterbox-client";
import { prisma } from "@/lib/db";
import { uploadAudio } from "@/lib/r2";
import { TEXT_MAX_LENGTH } from "@/features/text-to-speech/data/constants";
import { createTRPCRouter, orgProcedure } from "../init";

export const generationsRouter = createTRPCRouter({
    getById: orgProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input, ctx }) => {
            const generation = await prisma.generation.findUnique({
                where: {
                    id: input.id,
                    orgId: ctx.orgId,
                },
                omit: {
                    orgId: true,
                    r2ObjectKey: true,
                },
            })
            if (!generation) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }
            return{
                ...generation,
                audioUrl: `/api/audio/${generation.id}`,
            };
        }),
    getAll: orgProcedure.query(async ({ctx}) => {
        const generations = await prisma.generation.findMany({
            where: {orgId: ctx.orgId},
            orderBy: {createdAt: "desc"},
            omit: {
                orgId: true,
                r2ObjectKey: true,
            },
        });
        return generations;
    }),
    create: orgProcedure
        .input(
            z.object({
                text: z.string().min(1).max(TEXT_MAX_LENGTH),
                voiceId: z.string().min(1),
                temperature: z.number().min(0).max(2).default(0.8),
                topP: z.number().min(0).max(1).default(0.95),
                topK: z.number().min(0).max(10000).default(1000),
                repetitionPenalty: z.number().min(1).max(2).default(1.2),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const voice = await prisma.voice.findUnique({
                where: {
                    id: input.voiceId,
                    OR: [
                        {variant: "SYSTEM"},
                        {variant: "CUSTOM", orgId: ctx.orgId},
                    ]
                },
                select: {
                    id: true,
                    name: true,
                    r2ObjectKey: true,
                }
            });
            if(!voice){
                throw new TRPCError({ 
                    code: "NOT_FOUND" ,
                    message: "Voice not found",
                });
            }
            if(!voice.r2ObjectKey){
                throw new TRPCError({ 
                    code: "PRECONDITION_FAILED" ,
                    message: "Voice audio not available",
                });
            }
            if(!voice.name){
                throw new TRPCError({ 
                    code: "PRECONDITION_FAILED" ,
                    message: "Voice name not available",
                });
            }
            const {data, error} = await chatterbox.POST("/generate", {
                body: {
                    prompt: input.text,
                    voice_key: voice.r2ObjectKey,
                    temperature: input.temperature,
                    top_p: input.topP,
                    top_k: input.topK,
                    repetition_penalty: input.repetitionPenalty,
                    norm_loudness: true,
                },
                parseAs: "arrayBuffer",
            });

            if(error){
                throw new TRPCError({ 
                    code: "INTERNAL_SERVER_ERROR" ,
                    message:"Failed to generate audio",
                });
            }
            if(!(data instanceof ArrayBuffer)){
                throw new TRPCError({ 
                    code: "INTERNAL_SERVER_ERROR" ,
                    message:"Invalid response format",
                });
            }
            const buffer = Buffer.from(data);
            let generationId: string | null = null;
            let r2ObjectKey: string | null = null;

            try{
                const generation = await prisma.generation.create({
                    data: {
                        orgId: ctx.orgId,
                        text: input.text,
                        voiceName: voice.name,
                        temperature: input.temperature,
                        topP: input.topP,
                        topK: input.topK,
                        repetitionPenalty: input.repetitionPenalty,
                    },
                    select: {
                        id: true,
                    },
                });
                generationId = generation.id;
                r2ObjectKey = `generations/orgs/${ctx.orgId}/${generation.id}`

                await uploadAudio({buffer, key: r2ObjectKey});

                await prisma.generation.update({
                    where: {id: generationId},
                    data: {r2ObjectKey},
                });
            } catch {
                if(generationId){
                    await prisma.generation.delete({
                        where: {
                            id: generationId,
                        },
                    })
                    .catch(() => {});
                }
                throw new TRPCError({ 
                    code: "INTERNAL_SERVER_ERROR" ,
                    message:"Failed to create generation",
                });
            }
            if(!r2ObjectKey || !generationId){
                throw new TRPCError({ 
                    code: "INTERNAL_SERVER_ERROR" ,
                    message:"Failed to create generation",
                });
            }

            return {
                id: generationId,
            }
     })
})