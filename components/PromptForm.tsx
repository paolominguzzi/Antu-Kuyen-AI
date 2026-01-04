
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {Video} from '@google/genai';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  AspectRatio,
  GenerateVideoParams,
  GenerationMode,
  ImageFile,
  Resolution,
  VeoModel,
  VideoFile,
} from '../types';
import {
  ArrowRightIcon,
  ChevronDownIcon,
  FilmIcon,
  FramesModeIcon,
  PlusIcon,
  RectangleStackIcon,
  ReferencesModeIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  TextModeIcon,
  TvIcon,
  XMarkIcon,
} from './icons';

const aspectRatioDisplayNames: Record<AspectRatio, string> = {
  [AspectRatio.LANDSCAPE]: 'Landscape (16:9)',
  [AspectRatio.PORTRAIT]: 'Portrait (9:16)',
};

const modeIcons: Record<GenerationMode, React.ReactNode> = {
  [GenerationMode.TEXT_TO_VIDEO]: <TextModeIcon className="w-5 h-5" />,
  [GenerationMode.FRAMES_TO_VIDEO]: <FramesModeIcon className="w-5 h-5" />,
  [GenerationMode.REFERENCES_TO_VIDEO]: (
    <ReferencesModeIcon className="w-5 h-5" />
  ),
  [GenerationMode.EXTEND_VIDEO]: <FilmIcon className="w-5 h-5" />,
};

const EPIC_PROMPT_TEMPLATE = `Create one continuous 45-second commercial video with integrated scenes and coherent storytelling for “ANTÜ KÜYEN — PRIMERA MILLA LIMPIA”. Cinematic style, high-energy. 
SCENE FLOW: 
1) Sunrise drone over Arica valley. 
2) Hero close-up of local producer. 
3) Macro harvest of premium tomatoes. 
4) Branded truck launch. 
5) Tech scanner showing traceability. 
6) Final packshot with BRAND LOGO on clean background.
Text on screen: "MISIÓN", "ORIGEN LIMPIO", "TRAZABILIDAD TOTAL". Use the provided Logo and Product images as visual assets.`;

const fileToBase64 = <T extends {file: File; base64: string}>(
  file: File,
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      if (base64) {
        resolve({file, base64} as T);
      } else {
        reject(new Error('Failed to read file as base64.'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};
const fileToImageFile = (file: File): Promise<ImageFile> =>
  fileToBase64<ImageFile>(file);
const fileToVideoFile = (file: File): Promise<VideoFile> =>
  fileToBase64<VideoFile>(file);

// Fix: Define selectableModes for the mode selector UI
const selectableModes = Object.values(GenerationMode);

const CustomSelect: React.FC<{
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
}> = ({label, value, onChange, icon, children, disabled = false}) => (
  <div>
    <label
      className={`text-xs block mb-1.5 font-medium ${
        disabled ? 'text-gray-500' : 'text-gray-400'
      }`}>
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        {icon}
      </div>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full bg-[#1f1f1f] border border-gray-600 rounded-lg pl-10 pr-8 py-2.5 appearance-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-700/50 disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed">
        {children}
      </select>
      <ChevronDownIcon
        className={`w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
          disabled ? 'text-gray-600' : 'text-gray-400'
        }`}
      />
    </div>
  </div>
);

const ImageUpload: React.FC<{
  onSelect: (image: ImageFile) => void;
  onRemove?: () => void;
  image?: ImageFile | null;
  label: React.ReactNode;
  isSpecial?: boolean;
}> = ({onSelect, onRemove, image, label, isSpecial}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imageFile = await fileToImageFile(file);
        onSelect(imageFile);
      } catch (error) {
        console.error('Error converting file:', error);
      }
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  if (image) {
    return (
      <div className={`relative w-28 h-20 group border-2 ${isSpecial ? 'border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'border-transparent'}`}>
        <img
          src={URL.createObjectURL(image.file)}
          alt="preview"
          className="w-full h-full object-cover rounded-lg"
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
          <button
            type="button"
            onClick={onRemove}
            className="w-8 h-8 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white transition-colors"
            aria-label="Remove image">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        {isSpecial && <div className="absolute -bottom-2 -left-2 bg-orange-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase text-white shadow-lg">Logo AK</div>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={`w-28 h-20 bg-gray-700/50 hover:bg-gray-700 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-white transition-all ${isSpecial ? 'border-orange-500/50 hover:border-orange-500' : 'border-gray-600'}`}>
      <PlusIcon className={`w-6 h-6 ${isSpecial ? 'text-orange-500' : ''}`} />
      <span className="text-[10px] mt-1 font-bold uppercase tracking-tighter">{label}</span>
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </button>
  );
};

const VideoUpload: React.FC<{
  onSelect: (video: VideoFile) => void;
  onRemove?: () => void;
  video?: VideoFile | null;
  label: React.ReactNode;
}> = ({onSelect, onRemove, video, label}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const videoFile = await fileToVideoFile(file);
        onSelect(videoFile);
      } catch (error) {
        console.error('Error converting file:', error);
      }
    }
  };

  if (video) {
    return (
      <div className="relative w-48 h-28 group">
        <video
          src={URL.createObjectURL(video.file)}
          muted
          loop
          className="w-full h-full object-cover rounded-lg"
        />
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Remove video">
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="w-48 h-28 bg-gray-700/50 hover:bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-white transition-colors text-center">
      <PlusIcon className="w-6 h-6" />
      <span className="text-xs mt-1 px-2">{label}</span>
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept="video/*"
        className="hidden"
      />
    </button>
  );
};

interface PromptFormProps {
  onGenerate: (params: GenerateVideoParams) => void;
  initialValues?: GenerateVideoParams | null;
}

const PromptForm: React.FC<PromptFormProps> = ({
  onGenerate,
  initialValues,
}) => {
  const [prompt, setPrompt] = useState(initialValues?.prompt ?? '');
  const [model, setModel] = useState<VeoModel>(
    initialValues?.model ?? VeoModel.VEO_FAST,
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    initialValues?.aspectRatio ?? AspectRatio.LANDSCAPE,
  );
  const [resolution, setResolution] = useState<Resolution>(
    initialValues?.resolution ?? Resolution.P720,
  );
  const [generationMode, setGenerationMode] = useState<GenerationMode>(
    initialValues?.mode ?? GenerationMode.TEXT_TO_VIDEO,
  );
  const [startFrame, setStartFrame] = useState<ImageFile | null>(
    initialValues?.startFrame ?? null,
  );
  const [endFrame, setEndFrame] = useState<ImageFile | null>(
    initialValues?.endFrame ?? null,
  );
  const [referenceImages, setReferenceImages] = useState<ImageFile[]>(
    initialValues?.referenceImages ?? [],
  );
  const [logoImage, setLogoImage] = useState<ImageFile | null>(
    initialValues?.logoImage ?? null,
  );
  const [styleImage, setStyleImage] = useState<ImageFile | null>(
    initialValues?.styleImage ?? null,
  );
  const [inputVideo, setInputVideo] = useState<VideoFile | null>(
    initialValues?.inputVideo ?? null,
  );
  const [inputVideoObject, setInputVideoObject] = useState<Video | null>(
    initialValues?.inputVideoObject ?? null,
  );
  const [isLooping, setIsLooping] = useState(initialValues?.isLooping ?? false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modeSelectorRef = useRef<HTMLDivElement>(null);

  // Fix: Define dynamic promptPlaceholder based on generation mode
  const promptPlaceholder = 
    generationMode === GenerationMode.TEXT_TO_VIDEO ? "Describa la escena comercial (ej: Amanecer en el valle de Arica...)" :
    generationMode === GenerationMode.FRAMES_TO_VIDEO ? "Describa el movimiento entre estos cuadros..." :
    generationMode === GenerationMode.REFERENCES_TO_VIDEO ? "Describa el flujo comercial usando estos activos..." :
    "Describa qué sucede en la siguiente escena...";

  useEffect(() => {
    if (initialValues) {
      setPrompt(initialValues.prompt ?? '');
      setModel(initialValues.model ?? VeoModel.VEO_FAST);
      setAspectRatio(initialValues.aspectRatio ?? AspectRatio.LANDSCAPE);
      setResolution(initialValues.resolution ?? Resolution.P720);
      setGenerationMode(initialValues.mode ?? GenerationMode.TEXT_TO_VIDEO);
      setStartFrame(initialValues.startFrame ?? null);
      setEndFrame(initialValues.endFrame ?? null);
      setReferenceImages(initialValues.referenceImages ?? []);
      setLogoImage(initialValues.logoImage ?? null);
      setStyleImage(initialValues.styleImage ?? null);
      setInputVideo(initialValues.inputVideo ?? null);
      setInputVideoObject(initialValues.inputVideoObject ?? null);
      setIsLooping(initialValues.isLooping ?? false);
    }
  }, [initialValues]);

  useEffect(() => {
    if (generationMode === GenerationMode.REFERENCES_TO_VIDEO) {
      setModel(VeoModel.VEO);
      setAspectRatio(AspectRatio.LANDSCAPE);
      setResolution(Resolution.P720);
    } else if (generationMode === GenerationMode.EXTEND_VIDEO) {
      setResolution(Resolution.P720);
    }
  }, [generationMode]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [prompt]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modeSelectorRef.current &&
        !modeSelectorRef.current.contains(event.target as Node)
      ) {
        setIsModeSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onGenerate({
        prompt,
        model,
        aspectRatio,
        resolution,
        mode: generationMode,
        startFrame,
        endFrame,
        referenceImages,
        logoImage,
        styleImage,
        inputVideo,
        inputVideoObject,
        isLooping,
      });
    },
    [
      prompt,
      model,
      aspectRatio,
      resolution,
      generationMode,
      startFrame,
      endFrame,
      referenceImages,
      logoImage,
      styleImage,
      inputVideo,
      inputVideoObject,
      onGenerate,
      isLooping,
    ],
  );

  const handleSelectMode = (mode: GenerationMode) => {
    setGenerationMode(mode);
    setIsModeSelectorOpen(false);
    setStartFrame(null);
    setEndFrame(null);
    setReferenceImages([]);
    setLogoImage(null);
    setStyleImage(null);
    setInputVideo(null);
    setInputVideoObject(null);
    setIsLooping(false);
  };

  const loadTemplate = () => {
    setPrompt(EPIC_PROMPT_TEMPLATE);
    setGenerationMode(GenerationMode.REFERENCES_TO_VIDEO);
    setModel(VeoModel.VEO);
  };

  const renderMediaUploads = () => {
    if (generationMode === GenerationMode.FRAMES_TO_VIDEO) {
      return (
        <div className="mb-3 p-6 bg-gray-900/60 rounded-[2rem] border border-gray-800 flex flex-col items-center justify-center gap-4">
          <div className="flex items-center justify-center gap-4">
            <ImageUpload
              label="Start Frame"
              image={startFrame}
              onSelect={setStartFrame}
              onRemove={() => {
                setStartFrame(null);
                setIsLooping(false);
              }}
            />
            {!isLooping && (
              <ImageUpload
                label="End Frame"
                image={endFrame}
                onSelect={setEndFrame}
                onRemove={() => setEndFrame(null)}
              />
            )}
          </div>
          {startFrame && !endFrame && (
            <div className="mt-3 flex items-center">
              <input
                id="loop-video-checkbox"
                type="checkbox"
                checked={isLooping}
                onChange={(e) => setIsLooping(e.target.checked)}
                className="w-4 h-4 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-offset-gray-800 cursor-pointer"
              />
              <label
                htmlFor="loop-video-checkbox"
                className="ml-2 text-sm font-medium text-gray-300 cursor-pointer">
                Create a looping video
              </label>
            </div>
          )}
        </div>
      );
    }
    if (generationMode === GenerationMode.REFERENCES_TO_VIDEO) {
      return (
        <div className="mb-3 p-6 bg-gray-900/60 rounded-[2.5rem] border border-gray-800 space-y-4">
           <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Activo Marca</span>
              <ImageUpload
                label="Subir Logo"
                image={logoImage}
                onSelect={setLogoImage}
                onRemove={() => setLogoImage(null)}
                isSpecial
              />
            </div>
            <div className="w-px h-12 bg-gray-800 hidden md:block"></div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Activos Producto</span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {referenceImages.map((img, index) => (
                  <ImageUpload
                    key={index}
                    image={img}
                    label=""
                    onSelect={() => {}}
                    onRemove={() =>
                      setReferenceImages((imgs) => imgs.filter((_, i) => i !== index))
                    }
                  />
                ))}
                {referenceImages.length < 2 && ( // Logo takes 1 slot out of 3 total allowed by Veo
                  <ImageUpload
                    label="Add Product"
                    onSelect={(img) => setReferenceImages((imgs) => [...imgs, img])}
                  />
                )}
              </div>
            </div>
          </div>
          <button 
            type="button" 
            onClick={loadTemplate}
            className="w-full py-2 bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/20 rounded-xl text-orange-500 text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Usar Plantilla "Primera Milla Limpia" (45s)
          </button>
        </div>
      );
    }
    if (generationMode === GenerationMode.EXTEND_VIDEO) {
      return (
        <div className="mb-3 p-6 bg-gray-900/60 rounded-[2rem] border border-gray-800 flex items-center justify-center gap-4">
          <VideoUpload
            label={
              <>
                Input Video
                <br />
                (must be 720p veo generated)
              </>
            }
            video={inputVideo}
            onSelect={setInputVideo}
            onRemove={() => {
              setInputVideo(null);
              setInputVideoObject(null);
            }}
          />
        </div>
      );
    }
    return null;
  };

  const isRefMode = generationMode === GenerationMode.REFERENCES_TO_VIDEO;
  const isExtendMode = generationMode === GenerationMode.EXTEND_VIDEO;

  let isSubmitDisabled = false;
  let tooltipText = '';

  switch (generationMode) {
    case GenerationMode.TEXT_TO_VIDEO:
      isSubmitDisabled = !prompt.trim();
      if (isSubmitDisabled) {
        tooltipText = 'Please enter a prompt.';
      }
      break;
    case GenerationMode.FRAMES_TO_VIDEO:
      isSubmitDisabled = !startFrame;
      if (isSubmitDisabled) {
        tooltipText = 'A start frame is required.';
      }
      break;
    case GenerationMode.REFERENCES_TO_VIDEO:
      const hasNoRefs = referenceImages.length === 0 && !logoImage;
      const hasNoPrompt = !prompt.trim();
      isSubmitDisabled = hasNoRefs || hasNoPrompt;
      if (hasNoRefs && hasNoPrompt) {
        tooltipText = 'Please add reference image(s) or logo and enter a prompt.';
      } else if (hasNoRefs) {
        tooltipText = 'At least one reference image (logo or product) is required.';
      } else if (hasNoPrompt) {
        tooltipText = 'Please enter a prompt.';
      }
      break;
    case GenerationMode.EXTEND_VIDEO:
      isSubmitDisabled = !inputVideoObject;
      if (isSubmitDisabled) {
        tooltipText =
          'An input video from a previous generation is required to extend.';
      }
      break;
  }

  return (
    <div className="relative w-full">
      {isSettingsOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-3 p-6 bg-gray-900 border border-gray-800 rounded-[2rem] shadow-2xl z-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CustomSelect
              label="Model"
              value={model}
              onChange={(e) => setModel(e.target.value as VeoModel)}
              icon={<SparklesIcon className="w-5 h-5 text-orange-500" />}
              disabled={isRefMode}>
              {Object.values(VeoModel).map((modelValue) => (
                <option key={modelValue} value={modelValue}>
                  {modelValue}
                </option>
              ))}
            </CustomSelect>
            <CustomSelect
              label="Aspect Ratio"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
              icon={<RectangleStackIcon className="w-5 h-5 text-orange-500" />}
              disabled={isRefMode || isExtendMode}>
              {Object.entries(aspectRatioDisplayNames).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </CustomSelect>
            <div>
              <CustomSelect
                label="Resolution"
                value={resolution}
                onChange={(e) => setResolution(e.target.value as Resolution)}
                icon={<TvIcon className="w-5 h-5 text-orange-500" />}
                disabled={isRefMode || isExtendMode}>
                <option value={Resolution.P720}>720p</option>
                <option value={Resolution.P1080}>1080p</option>
              </CustomSelect>
            </div>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="w-full">
        {renderMediaUploads()}
        <div className="flex items-end gap-3 bg-gray-900 border border-gray-800 rounded-[2.5rem] p-3 shadow-lg focus-within:ring-2 focus-within:ring-orange-600 transition-all">
          <div className="relative" ref={modeSelectorRef}>
            <button
              type="button"
              onClick={() => setIsModeSelectorOpen((prev) => !prev)}
              className="flex shrink-0 items-center gap-2 px-4 py-3 rounded-2xl hover:bg-gray-800 text-gray-300 hover:text-white transition-all bg-black/40"
              aria-label="Select generation mode">
              {modeIcons[generationMode]}
              <span className="font-black text-[10px] uppercase tracking-widest hidden sm:inline">
                {generationMode}
              </span>
            </button>
            {isModeSelectorOpen && (
              <div className="absolute bottom-full mb-2 w-60 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-30">
                {selectableModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleSelectMode(mode)}
                    className={`w-full text-left flex items-center gap-3 p-4 hover:bg-orange-600/20 transition-colors ${generationMode === mode ? 'bg-orange-600/10 text-orange-500' : 'text-gray-400'}`}>
                    {modeIcons[mode]}
                    <span className="font-bold text-xs uppercase">{mode}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={promptPlaceholder}
            className="flex-grow bg-transparent focus:outline-none resize-none text-sm text-gray-200 placeholder-gray-600 max-h-48 py-3 font-medium"
            rows={1}
          />
          <button
            type="button"
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className={`p-3 rounded-full hover:bg-gray-800 transition-all ${isSettingsOpen ? 'bg-orange-600 text-black' : 'text-gray-500'}`}
            aria-label="Toggle settings">
            <SlidersHorizontalIcon className="w-6 h-6" />
          </button>
          <div className="relative group">
            <button
              type="submit"
              className="p-3 bg-orange-600 rounded-full hover:bg-orange-500 disabled:bg-gray-800 disabled:cursor-not-allowed transition-all shadow-lg active:scale-90"
              aria-label="Generate video"
              disabled={isSubmitDisabled}>
              <ArrowRightIcon className="w-6 h-6 text-black" />
            </button>
            {isSubmitDisabled && tooltipText && (
              <div
                role="tooltip"
                className="absolute bottom-full right-0 mb-3 w-max max-w-xs px-4 py-2 bg-gray-900 border border-gray-800 text-white text-[10px] font-bold uppercase rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-40">
                {tooltipText}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default PromptForm;
