
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {
  GoogleGenAI,
  Video,
  VideoGenerationReferenceImage,
  VideoGenerationReferenceType,
} from '@google/genai';
import {GenerateVideoParams, GenerationMode} from '../types';

export const CATALOG_DATA = `
ANTÜ KÜYEN AGRO - CATÁLOGO COMERCIAL DIC 2025 - ENE 2026:

MISIÓN: "Guardián de los Valles". Primera milla limpia, trazable y no-GMO en Arica, Chile.

PRODUCTOS Y DISPONIBILIDAD:
1. Tomates Beef (Suministro Asegurado):
   - ANTUMAY: Rústico, hermoso formato, homogéneo. (700 - 1000 toneladas/mes).
   - ALAMINA: Calidad postcosecha incomparable. Ideal invierno/primor. (100 - 300 toneladas/mes).
   - ATTIYA: Calibre grande, excelente cuaja en frío y baja luz. (100 - 300 toneladas/mes).

2. Tomates Cherry (Suministro Asegurado):
   - ROMANITA: Midi Plum, sabor y textura únicos. 7.5° Brix. (30 - 100 toneladas/mes).
   - NANCY: Planta vigorosa, color rojo intenso. 8.5° Brix. (30 - 100 toneladas/mes).
   - ORNELA: Grape indeterminado, maduración temprana. 7-8.5° Brix. (30 - 100 toneladas/mes).

3. Pimientos de Alta Calidad:
   - Achille (Verde: Vit C, K, ácido fólico).
   - Coraza (Rojo: paredes gruesas, vibrante).
   - Sven & Prosperity (Amarillo/Naranja: sabor dulce).
   - Disponibilidad total pimientos: 20 a 30 toneladas/mes.

4. Ajíes (Inferno, Fakur y otros):
   - Ají Híbrido Húngaro: Ciclo 85-95 días, 22-25 cm, alta pungencia.
   - Ají Hot Banana: Estructura grande, paredes gruesas, larga vida de anaquel.
   - Disponibilidad total ajíes: 20 a 30 toneladas/mes.

5. Cebolla Roja y Albahaca:
   - Cebolla Morada Rasta: Sabores únicos, textura crujiente, aroma intenso.
   - Albahaca Italiana: Hojas anchas, fragantes, ideal gourmet.
   - Disponibilidad conjunta: 40 a 80 toneladas/mes.

6. Zapallitos y Pepinos:
   - Zapallitos (Terminator, Romeral, Meteoro): Cilíndricos, Vit A, C, K.
   - Zapallito Bola 8: Gourmet, ideal para rellenos.
   - Pepino Ensalada (Fuseta, Javan, Cumlaude): Refrescante, Vit K y C.
   - Disponibilidad cada grupo: 20 a 30 toneladas/mes.

ESTRUCTURA CORPORATIVA (Holding Antü Küyen SpA):
Operador Agrofinanciero Regenerativo (OAR) con 20% margen neto objetivo 2026. Control de riesgo mediante matriz de 5 seguros.

CONTACTO:
Chile: Paolo Minguzzi (+56 9 6848 8698, p.minguzzi@agroantukuyen.com).
Argentina: Anuar Peche (+54 9 351 408 6291, Representación Técnica).
`;

export const askCatalogAssistant = async (prompt: string, history: {role: string, parts: {text: string}[]}[] = []) => {
  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `Eres el Asistente Estratégico y Operativo de Antü Küyen Agro. Tu base de conocimiento es el Catálogo DIC 2025 - ENE 2026. 
      Proporciona datos exactos de disponibilidad (toneladas/mes) y grados Brix cuando se te pregunte. 
      Mantén el tono de "Guardián de los Valles". Explica los beneficios nutricionales (Vitaminas C, K, antocianinas) y el modelo OAR (Operador Agrofinanciero Regenerativo).
      Si preguntan por contacto, menciona a Paolo Minguzzi para Chile y Anuar Peche para Argentina.
      Información del catálogo: ${CATALOG_DATA}`,
    },
  });

  const response = await chat.sendMessage({ message: prompt });
  return response.text;
};

export const generateVideo = async (
  params: GenerateVideoParams,
): Promise<{objectUrl: string; blob: Blob; uri: string; video: Video}> => {
  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

  const config: any = {
    numberOfVideos: 1,
    resolution: params.resolution,
  };

  if (params.mode !== GenerationMode.EXTEND_VIDEO) {
    config.aspectRatio = params.aspectRatio;
  }

  const generateVideoPayload: any = {
    model: params.model,
    config: config,
  };

  if (params.prompt) {
    generateVideoPayload.prompt = params.prompt;
  }

  const referenceImagesPayload: VideoGenerationReferenceImage[] = [];

  if (params.logoImage) {
    referenceImagesPayload.push({
      image: {
        imageBytes: params.logoImage.base64,
        mimeType: params.logoImage.file.type,
      },
      referenceType: VideoGenerationReferenceType.ASSET,
    });
  }

  if (params.referenceImages) {
    for (const img of params.referenceImages) {
      if (referenceImagesPayload.length < 3) {
        referenceImagesPayload.push({
          image: {
            imageBytes: img.base64,
            mimeType: img.file.type,
          },
          referenceType: VideoGenerationReferenceType.ASSET,
        });
      }
    }
  }

  if (referenceImagesPayload.length > 0) {
    generateVideoPayload.config.referenceImages = referenceImagesPayload;
  }

  if (params.mode === GenerationMode.FRAMES_TO_VIDEO) {
    if (params.startFrame) {
      generateVideoPayload.image = {
        imageBytes: params.startFrame.base64,
        mimeType: params.startFrame.file.type,
      };
    }

    const finalEndFrame = params.isLooping
      ? params.startFrame
      : params.endFrame;
    if (finalEndFrame) {
      generateVideoPayload.config.lastFrame = {
        imageBytes: finalEndFrame.base64,
        mimeType: finalEndFrame.file.type,
      };
    }
  } else if (params.mode === GenerationMode.EXTEND_VIDEO) {
    if (params.inputVideoObject) {
      generateVideoPayload.video = params.inputVideoObject;
    } else {
      throw new Error('An input video object is required to extend a video.');
    }
  }

  let operation = await ai.models.generateVideos(generateVideoPayload);

  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  if (operation?.response) {
    const videos = operation.response.generatedVideos;
    if (!videos || videos.length === 0) throw new Error('No videos generated.');

    const firstVideo = videos[0];
    const videoObject = firstVideo.video;
    const url = decodeURIComponent(videoObject.uri);
    const res = await fetch(`${url}&key=${process.env.API_KEY}`);

    if (!res.ok) throw new Error(`Failed to fetch video: ${res.status}`);

    const videoBlob = await res.blob();
    const objectUrl = URL.createObjectURL(videoBlob);

    return {objectUrl, blob: videoBlob, uri: url, video: videoObject};
  } else {
    throw new Error('No videos generated.');
  }
};
