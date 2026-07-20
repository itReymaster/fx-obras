import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, CheckCircle2, ImagePlus, MapPin, Mic, Square, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FocusEvent } from "react";
import type { FieldErrors } from "react-hook-form";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import {
  commercialPotentialOptions,
  constructionStageOptions,
  constructionTypeOptions,
  statusOptions,
} from "../../../utils/labels";
import { APP_CONFIG } from "../../../config/app";
import { getAuthenticatedUser } from "../../../config/users";
import { opportunityFormSchema, type OpportunityFormValues } from "../schemas/opportunity-form.schema";
import { opportunitiesApi } from "../services/opportunities-api";
import type { Opportunity, OpportunityAudio } from "../types/opportunity.types";

type ReverseGeocodePayload = {
  address?: {
    postcode?: string;
    road?: string;
    pedestrian?: string;
    footway?: string;
    path?: string;
    cycleway?: string;
    residential?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
    city_district?: string;
    quarter?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state_code?: string;
    ["ISO3166-2-lvl4"]?: string;
  };
};

type ViaCepPayload = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

type ResolvedAddress = {
  postalCode?: string;
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  noNumberAvailable?: boolean;
};

const reverseGeocodeFromCoords = async (lat: number, lng: number): Promise<ResolvedAddress | null> => {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: "json",
      addressdetails: "1",
      zoom: "18",
    });

    console.log(`[Geolocation] Buscando endereço para: ${lat}, ${lng}`);

    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "FxObras/1.0 (Geolocation)",
      },
    });

    if (!response.ok) {
      console.error(`[Geolocation] Erro Nominatim: ${response.status} ${response.statusText}`);
      return null;
    }

    const payload = (await response.json()) as ReverseGeocodePayload;
    const address = payload.address;
    
    if (!address) {
      console.warn("[Geolocation] Resposta sem campo 'address'", payload);
      return null;
    }

    console.log("[Geolocation] Endereço encontrado:", address);

    const stateRaw = address["ISO3166-2-lvl4"] ?? address.state_code;
    const stateCode = stateRaw?.split("-").pop()?.toUpperCase();

    // Verificar se encontrou a rua mas não tem número de casa
    const hasStreet = !!(address.road || address.pedestrian || address.footway || address.path || address.cycleway || address.residential);
    const noNumberAvailable = hasStreet && !address.house_number;

    const result: ResolvedAddress = {
      postalCode: address.postcode,
      street:
        address.road ??
        address.pedestrian ??
        address.footway ??
        address.path ??
        address.cycleway ??
        address.residential,
      number: address.house_number,
      district:
        address.suburb ??
        address.neighbourhood ??
        address.city_district ??
        address.quarter,
      city:
        address.city ??
        address.town ??
        address.village ??
        address.municipality,
      state: stateCode && stateCode.length === 2 ? stateCode : undefined,
      noNumberAvailable,
    };

    console.log("[Geolocation] Resultado parseado:", result);
    return result;
  } catch (error) {
    console.error("[Geolocation] Erro ao fazer reverse geocode:", error);
    return null;
  }
};

const normalizePostalCode = (value?: string | null) => value?.replace(/\D/g, "").slice(0, 8) ?? "";

const formatPostalCode = (value?: string | null) => {
  const digits = normalizePostalCode(value);
  if (digits.length !== 8) return value?.trim() ?? "";
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const fetchAddressFromPostalCode = async (postalCode: string): Promise<ResolvedAddress | null> => {
  try {
    const response = await fetch(`https://viacep.com.br/ws/${postalCode}/json/`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ViaCepPayload;
    if (payload.erro) {
      return null;
    }

    return {
      postalCode: formatPostalCode(payload.cep ?? postalCode),
      street: payload.logradouro ?? undefined,
      district: payload.bairro ?? undefined,
      city: payload.localidade ?? undefined,
      state: payload.uf?.toUpperCase(),
      noNumberAvailable: false,
    };
  } catch {
    return null;
  }
};

const formDefaultValues: OpportunityFormValues = {
  status: "CAPTURED",
  addressSource: "MANUAL",
  constructionType: "UNKNOWN",
  constructionStage: "UNKNOWN",
  commercialPotential: "NOT_EVALUATED",
  withoutNumber: false,
  isTest: false,
};

type PendingAudio = {
  id: string;
  file: File;
  url: string;
  createdAt: string;
};

const AUDIO_WAVE_BAR_COUNT = 24;
const AUDIO_WAVE_NOISE_FLOOR = 0.03;

const createIdleWaveform = () =>
  Array.from({ length: AUDIO_WAVE_BAR_COUNT }, (_, index) => {
    const base = 0.22;
    const variation = ((index % 5) + 1) * 0.015;
    return Math.min(0.34, base + variation);
  });

const mapOpportunityToFormValues = (opportunity: Opportunity): OpportunityFormValues => {
  const source = opportunity as Opportunity & {
    complement?: string | null;
    withoutNumber?: boolean;
  };

  return {
    title: opportunity.title,
    status: opportunity.status,
    constructionType: opportunity.constructionType,
    constructionStage: opportunity.constructionStage,
    commercialPotential: opportunity.commercialPotential,
    addressSource: opportunity.addressSource,
    postalCode: opportunity.postalCode ?? undefined,
    street: opportunity.street ?? undefined,
    number: opportunity.number ?? undefined,
    withoutNumber: source.withoutNumber ?? !opportunity.number,
    complement: source.complement ?? undefined,
    district: opportunity.district ?? undefined,
    city: opportunity.city ?? undefined,
    state: opportunity.state ?? undefined,
    latitude: opportunity.latitude ?? undefined,
    longitude: opportunity.longitude ?? undefined,
    locationAccuracy: opportunity.locationAccuracy ?? undefined,
    locationCapturedAt: opportunity.locationCapturedAt ?? undefined,
    notes: opportunity.notes ?? undefined,
    contactName: opportunity.contactName ?? undefined,
    contactPhone: opportunity.contactPhone ?? undefined,
    contactEmail: opportunity.contactEmail ?? undefined,
    nextAction: opportunity.nextAction ?? undefined,
    nextActionDate: opportunity.nextActionDate ?? undefined,
    tagsText: opportunity.tags?.length ? opportunity.tags.join(", ") : undefined,
    isTest: opportunity.isTest ?? false,
  };
};

export function OpportunityWizardPage() {
  const navigate = useNavigate();
  const { id: opportunityId = "" } = useParams();
  const isEditing = Boolean(opportunityId);
  const [step, setStep] = useState(1);
  const [showQualificationFlow, setShowQualificationFlow] = useState(false);
  const [showAdvancedContact, setShowAdvancedContact] = useState(false);
  const [showAdvancedWork, setShowAdvancedWork] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ uploaded: number; total: number } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [photoActionError, setPhotoActionError] = useState<string | null>(null);
  const [photoBusyId, setPhotoBusyId] = useState<string | null>(null);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [locationHint, setLocationHint] = useState<string | null>(null);
  const [postalCodeHint, setPostalCodeHint] = useState<string | null>(null);
  const [savedOpportunity, setSavedOpportunity] = useState<{ id: string; code: string } | null>(null);
  const [loadingOpportunity, setLoadingOpportunity] = useState(isEditing);
  const [loadedOpportunity, setLoadedOpportunity] = useState<Opportunity | null>(null);
  const [existingAudios, setExistingAudios] = useState<OpportunityAudio[]>([]);
  const [pendingAudios, setPendingAudios] = useState<PendingAudio[]>([]);
  const [audioActionError, setAudioActionError] = useState<string | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingWaveform, setRecordingWaveform] = useState<number[]>(() => createIdleWaveform());
  const [isHighSensitivityEnabled, setIsHighSensitivityEnabled] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const waveformFrameRef = useRef<number | null>(null);
  const previousWaveformRef = useRef<number[]>(createIdleWaveform());
  const pendingAudiosRef = useRef<PendingAudio[]>([]);

  const isSecureContextForMic =
    typeof window !== "undefined" &&
    (window.isSecureContext || window.location.hostname === "localhost");

  const formatAudioSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatRecordingTime = (seconds: number): string => {
    const safeSeconds = Math.max(0, Math.min(60, seconds));
    const minutesPart = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
    const secondsPart = String(safeSeconds % 60).padStart(2, "0");
    return `${minutesPart}:${secondsPart}`;
  };

  const recordingProgress = Math.min(100, Math.round((recordingSeconds / 60) * 100));

  const goToPhotos = () => {
    setShowQualificationFlow(false);
    setStep(2);
  };

  const goToQualification = () => {
    setShowQualificationFlow(true);
    setStep(5);
  };

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const stopWaveformMonitor = () => {
    if (waveformFrameRef.current) {
      window.cancelAnimationFrame(waveformFrameRef.current);
      waveformFrameRef.current = null;
    }

    sourceNodeRef.current?.disconnect();
    sourceNodeRef.current = null;

    analyserNodeRef.current?.disconnect();
    analyserNodeRef.current = null;

    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }

    const idleWaveform = createIdleWaveform();
    previousWaveformRef.current = idleWaveform;
    setRecordingWaveform(idleWaveform);
  };

  const startWaveformMonitor = (stream: MediaStream, highSensitivityEnabled: boolean) => {
    const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const audioContext = new AudioContextConstructor();
    const sourceNode = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.7;

    sourceNode.connect(analyser);

    audioContextRef.current = audioContext;
    sourceNodeRef.current = sourceNode;
    analyserNodeRef.current = analyser;

    const sampleBuffer = new Uint8Array(analyser.frequencyBinCount);

    const renderWaveform = () => {
      const currentAnalyser = analyserNodeRef.current;
      if (!currentAnalyser) return;

      currentAnalyser.getByteFrequencyData(sampleBuffer);

      const averageLevel = sampleBuffer.reduce((sum, value) => sum + value, 0) / (sampleBuffer.length * 255);
      const baseGain = averageLevel < 0.12 ? 1.75 : averageLevel < 0.2 ? 1.45 : 1.2;
      const sensitivityMultiplier = highSensitivityEnabled ? 1.35 : 1;
      const adaptiveGain = baseGain * sensitivityMultiplier;
      const noiseFloor = highSensitivityEnabled ? 0.015 : AUDIO_WAVE_NOISE_FLOOR;

      const nextWaveform = Array.from({ length: AUDIO_WAVE_BAR_COUNT }, (_, barIndex) => {
        const start = Math.floor((barIndex * sampleBuffer.length) / AUDIO_WAVE_BAR_COUNT);
        const end = Math.max(start + 1, Math.floor(((barIndex + 1) * sampleBuffer.length) / AUDIO_WAVE_BAR_COUNT));
        let peak = 0;

        for (let index = start; index < end; index += 1) {
          peak = Math.max(peak, sampleBuffer[index] ?? 0);
        }

        const normalized = peak / 255;
        const gated = normalized <= noiseFloor ? 0 : (normalized - noiseFloor) / (1 - noiseFloor);
        const boosted = Math.min(1, Math.pow(gated, 0.78) * adaptiveGain);
        const previous = previousWaveformRef.current[barIndex] ?? 0.2;
        const smoothed = previous * 0.5 + boosted * 0.5;
        return Math.min(1, 0.18 + smoothed * 0.82);
      });

      previousWaveformRef.current = nextWaveform;
      setRecordingWaveform(nextWaveform);
      waveformFrameRef.current = window.requestAnimationFrame(renderWaveform);
    };

    waveformFrameRef.current = window.requestAnimationFrame(renderWaveform);
  };

  const stopRecordingResources = () => {
    clearRecordingTimer();
    stopWaveformMonitor();
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaChunksRef.current = [];
    setIsRecordingAudio(false);
    setRecordingSeconds(0);
  };

  const makeAudioFileName = (mimeType: string) => {
    const extension =
      mimeType.includes("mpeg") ? "mp3" :
      mimeType.includes("wav") ? "wav" :
      mimeType.includes("ogg") ? "ogg" :
      mimeType.includes("mp4") ? "mp4" :
      "webm";
    return `audio-${Date.now()}.${extension}`;
  };

  const addPendingAudioFile = (file: File) => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const url = URL.createObjectURL(file);
    setPendingAudios((current) => [
      {
        id,
        file,
        url,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
  };

  const onSelectAudioFiles = (selected: FileList | null) => {
    if (!selected) return;
    setAudioActionError(null);
    const filesList = Array.from(selected)
      .filter((file) => file.type.startsWith("audio/"))
      .slice(0, 5);

    if (filesList.length === 0) {
      setAudioActionError("Selecione arquivos de audio validos.");
      return;
    }

    filesList.forEach((file) => addPendingAudioFile(file));
  };

  const handleRemovePendingAudio = (audioId: string) => {
    setPendingAudios((current) => {
      const target = current.find((audio) => audio.id === audioId);
      if (target) URL.revokeObjectURL(target.url);
      return current.filter((audio) => audio.id !== audioId);
    });
  };

  const handleDeleteExistingAudio = async (audioId: string) => {
    if (!isEditing) return;
    const confirmed = window.confirm("Remover este audio anexado?");
    if (!confirmed) return;

    try {
      await opportunitiesApi.deleteAudio(opportunityId, audioId);
      const data = await opportunitiesApi.listAudios(opportunityId);
      setExistingAudios(data);
      setAudioActionError(null);
    } catch (error: any) {
      setAudioActionError(error?.response?.data?.message ?? "Nao foi possivel remover o audio.");
    }
  };

  const handleStartAudioRecording = async () => {
    if (!isSecureContextForMic) {
      setAudioActionError("Gravacao de audio requer HTTPS ou localhost.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setAudioActionError("Seu navegador nao suporta gravacao de audio.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const preferredTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg",
      ];
      const selectedType = preferredTypes.find((value) => MediaRecorder.isTypeSupported(value));
      const recorder = selectedType ? new MediaRecorder(stream, { mimeType: selectedType }) : new MediaRecorder(stream);

      mediaChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(mediaChunksRef.current, { type: mimeType });
        stopRecordingResources();
        if (blob.size > 0) {
          const file = new File([blob], makeAudioFileName(mimeType), { type: mimeType });
          addPendingAudioFile(file);
        }
      };

      recorder.start(200);
      mediaRecorderRef.current = recorder;
      startWaveformMonitor(stream, isHighSensitivityEnabled);
      setAudioActionError(null);
      setIsRecordingAudio(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((previous) => {
          const next = previous + 1;
          if (next >= 60 && mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
          }
          return Math.min(next, 60);
        });
      }, 1000);
    } catch {
      stopRecordingResources();
      setAudioActionError("Nao foi possivel acessar o microfone.");
    }
  };

  const handleStopAudioRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const mapGeolocationError = (error?: GeolocationPositionError) => {
    if (!error) return "Nao foi possivel capturar o GPS. Use endereco manual.";
    if (error.code === error.PERMISSION_DENIED) {
      return "Permissao de localizacao negada no navegador do celular.";
    }
    if (error.code === error.TIMEOUT) {
      return "Tempo de captura excedido. Verifique sinal de GPS e tente novamente.";
    }
    if (error.code === error.POSITION_UNAVAILABLE) {
      return "Localizacao indisponivel no aparelho neste momento.";
    }
    return "Nao foi possivel capturar o GPS. Use endereco manual.";
  };

  const getCurrentPosition = (options: PositionOptions) =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

  const applyResolvedAddress = (resolvedAddress: ResolvedAddress, source: "GPS" | "CEP") => {
    if (resolvedAddress.postalCode) setValue("postalCode", resolvedAddress.postalCode, { shouldDirty: true });
    if (resolvedAddress.street) setValue("street", resolvedAddress.street, { shouldDirty: true });
    if (resolvedAddress.number) {
      setValue("number", resolvedAddress.number, { shouldDirty: true });
      setValue("withoutNumber", false, { shouldDirty: true });
    } else if (resolvedAddress.noNumberAvailable) {
      setValue("number", "", { shouldDirty: true });
      setValue("withoutNumber", true, { shouldDirty: true });
    }
    if (resolvedAddress.district) setValue("district", resolvedAddress.district, { shouldDirty: true });
    if (resolvedAddress.city) setValue("city", resolvedAddress.city, { shouldDirty: true });
    if (resolvedAddress.state) setValue("state", resolvedAddress.state, { shouldDirty: true });

    if (source === "CEP") {
      setValue("addressSource", "MANUAL", { shouldDirty: true });
      setValue("latitude", undefined, { shouldDirty: true });
      setValue("longitude", undefined, { shouldDirty: true });
      setValue("locationAccuracy", undefined, { shouldDirty: true });
      setValue("locationCapturedAt", undefined, { shouldDirty: true });
      setLocationHint(null);
    }
  };

  const handlePostalCodeBlur = async (event: FocusEvent<HTMLInputElement>) => {
    const postalCodeDigits = normalizePostalCode(event.target.value);

    if (postalCodeDigits.length !== 8) {
      setPostalCodeHint(null);
      return;
    }

    setPostalCodeHint("Buscando endereço pelo CEP...");

    const resolvedAddress = await fetchAddressFromPostalCode(postalCodeDigits);

    if (!resolvedAddress) {
      setPostalCodeHint("CEP não encontrado no ViaCEP. Complete o endereço manualmente.");
      return;
    }

    applyResolvedAddress(resolvedAddress, "CEP");
    setPostalCodeHint("Endereço preenchido automaticamente pelo CEP.");
  };

  const {
    register,
    watch,
    setValue,
    reset,
    formState: { errors },
    handleSubmit,
  } = useForm<any>({
    resolver: zodResolver(opportunityFormSchema),
    defaultValues: formDefaultValues,
  });

  useEffect(() => {
    if (!isEditing) return;

    let cancelled = false;
    setLoadingOpportunity(true);
    setSaveError(null);

    void Promise.all([opportunitiesApi.getById(opportunityId), opportunitiesApi.listAudios(opportunityId)])
      .then(([opportunity, audios]) => {
        if (cancelled) return;

        setLoadedOpportunity(opportunity);
        setExistingAudios(audios);
        setPhotoActionError(null);
        setAudioActionError(null);
        reset({
          ...formDefaultValues,
          ...mapOpportunityToFormValues(opportunity),
        });
        setFiles([]);
        setPrimaryIndex(0);
      })
      .catch(() => {
        if (cancelled) return;
        setSaveError("Nao foi possivel carregar a obra para edicao.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingOpportunity(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isEditing, opportunityId, reset]);

  useEffect(() => {
    pendingAudiosRef.current = pendingAudios;
  }, [pendingAudios]);

  useEffect(() => {
    if (!isRecordingAudio || !mediaStreamRef.current) return;
    stopWaveformMonitor();
    startWaveformMonitor(mediaStreamRef.current, isHighSensitivityEnabled);
  }, [isHighSensitivityEnabled, isRecordingAudio]);

  useEffect(() => {
    return () => {
      stopRecordingResources();
      pendingAudiosRef.current.forEach((audio) => URL.revokeObjectURL(audio.url));
    };
  }, []);

  const values = watch();

  const maxStep = showQualificationFlow || step >= 4 ? 5 : 3;
  const progress = useMemo(() => Math.round((Math.min(step, maxStep) / maxStep) * 100), [step, maxStep]);

  const addFiles = (selected: FileList | null) => {
    if (!selected) return;
    const next = [...files, ...Array.from(selected)].slice(0, 15);
    setFiles(next);
  };

  const existingPhotos = loadedOpportunity?.photos ?? [];

  const sortPhotosByCreatedAtAsc = (photos: Opportunity["photos"]) => {
    return [...photos].sort((left, right) => {
      return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    });
  };

  const updateLoadedPhotos = (nextPhotos: Opportunity["photos"]) => {
    setLoadedOpportunity((current) => {
      if (!current) return current;
      return { ...current, photos: nextPhotos };
    });
  };

  const handleSetPrimaryExistingPhoto = async (photoId: string) => {
    if (!isEditing || !loadedOpportunity) return;
    setPhotoBusyId(photoId);
    setPhotoActionError(null);

    try {
      await opportunitiesApi.setPrimaryPhoto(opportunityId, photoId);
      const nextPhotos = loadedOpportunity.photos.map((photo) => ({
        ...photo,
        isPrimary: photo.id === photoId,
      }));
      updateLoadedPhotos(nextPhotos);
    } catch (error: any) {
      setPhotoActionError(error?.response?.data?.message ?? "Nao foi possivel definir a foto principal.");
    } finally {
      setPhotoBusyId(null);
    }
  };

  const handleDeleteExistingPhoto = async (photoId: string) => {
    if (!isEditing || !loadedOpportunity) return;
    setPhotoBusyId(photoId);
    setPhotoActionError(null);

    try {
      const photoToDelete = loadedOpportunity.photos.find((photo) => photo.id === photoId);
      await opportunitiesApi.deletePhoto(opportunityId, photoId);

      const remainingPhotos = loadedOpportunity.photos.filter((photo) => photo.id !== photoId);
      const nextPrimaryId = photoToDelete?.isPrimary
        ? sortPhotosByCreatedAtAsc(remainingPhotos)[0]?.id
        : remainingPhotos.find((photo) => photo.isPrimary)?.id;

      const nextPhotos = remainingPhotos.map((photo) => ({
        ...photo,
        isPrimary: photo.id === nextPrimaryId,
      }));

      updateLoadedPhotos(nextPhotos);
    } catch (error: any) {
      setPhotoActionError(error?.response?.data?.message ?? "Nao foi possivel remover a foto.");
    } finally {
      setPhotoBusyId(null);
    }
  };

  const removeFile = (index: number) => {
    const next = files.filter((_, fileIndex) => fileIndex !== index);
    setFiles(next);
    if (primaryIndex >= next.length) {
      setPrimaryIndex(0);
    }
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocalizacao nao suportada neste navegador.");
      return;
    }

    if (!window.isSecureContext) {
      alert("A geolocalizacao exige contexto seguro (HTTPS confiavel). Verifique o certificado no celular.");
      return;
    }

    setCapturingLocation(true);
    setLocationHint(null);

    const runCapture = async () => {
      try {
        const permissions = (navigator as Navigator & {
          permissions?: { query: (args: { name: "geolocation" }) => Promise<{ state: "granted" | "denied" | "prompt" }> };
        }).permissions;

        if (permissions) {
          const permissionStatus = await permissions.query({ name: "geolocation" });
          if (permissionStatus.state === "denied") {
            setCapturingLocation(false);
            alert("A permissao de localizacao esta bloqueada. Libere nas configuracoes do navegador.");
            return;
          }
        }

        let position: GeolocationPosition;
        try {
          position = await getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 0,
          });
        } catch {
          // Fallback mais tolerante para aparelhos que falham com alta precisao.
          position = await getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 120000,
          });
        }

        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));

        setValue("addressSource", "GPS");
        setValue("latitude", latitude);
        setValue("longitude", longitude);
        setValue("locationAccuracy", Number(position.coords.accuracy.toFixed(2)));
        setValue("locationCapturedAt", new Date().toISOString());

        try {
          const resolvedAddress = await reverseGeocodeFromCoords(latitude, longitude);
          
          if (resolvedAddress) {
            applyResolvedAddress(resolvedAddress, "GPS");

            if (!resolvedAddress.number && resolvedAddress.noNumberAvailable) {
              // Se encontrou a rua mas não tem número registrado no OpenStreetMap
              console.log("[Geolocation] Numero nao disponivel no OpenStreetMap - marcando 'withoutNumber'");
            }

            if (resolvedAddress.street || resolvedAddress.city) {
              if (resolvedAddress.noNumberAvailable) {
                setLocationHint("✅ Endereco preenchido automaticamente (numero nao registrado no mapa).");
                console.log("[Geolocation] Sucesso: Endereço preenchido com rua mas sem número disponível");
              } else {
                setLocationHint("✅ Endereco preenchido automaticamente com base na localizacao.");
                console.log("[Geolocation] Sucesso: Endereço preenchido");
              }
            } else {
              setLocationHint("⚠️ Localizacao capturada. Complete o endereco manualmente, se necessario.");
              console.warn("[Geolocation] Parcial: Coordenadas capturadas mas endereço incompleto");
            }
          } else {
            setLocationHint("⚠️ Localizacao capturada. Complete o endereco manualmente, pois nao conseguimos resolver o endereco automaticamente.");
            console.warn("[Geolocation] Fallback: Nominatim não retornou endereço");
          }
        } catch (error) {
          console.error("[Geolocation] Erro ao preencher endereço:", error);
          setLocationHint("⚠️ Localizacao capturada, mas houve erro ao preencher o endereco automaticamente. Complete manualmente.");
        } finally {
          setCapturingLocation(false);
        }
      } catch (error) {
        setCapturingLocation(false);
        setLocationHint(null);
        alert(mapGeolocationError(error as GeolocationPositionError));
      }
    };

    void runCapture();
  };

  const handleInvalidSubmit = (formErrors: FieldErrors<OpportunityFormValues>) => {
    const keys = Object.keys(formErrors);
    if (keys.length === 0) {
      setSaveError("Nao foi possivel validar o formulario.");
      return;
    }

    const locationFields = [
      "postalCode",
      "street",
      "number",
      "withoutNumber",
      "complement",
      "district",
      "city",
      "state",
      "latitude",
      "longitude",
      "locationAccuracy",
      "locationCapturedAt",
    ];
    const infoFields = [
      "title",
      "constructionType",
      "constructionStage",
      "commercialPotential",
      "notes",
      "contactName",
      "contactPhone",
      "contactEmail",
      "nextAction",
      "nextActionDate",
      "tagsText",
    ];

    const firstField = keys[0];
    if (locationFields.includes(firstField)) setStep(1);
    else if (infoFields.includes(firstField)) setStep(3);

    const firstMessage = (formErrors as any)[firstField]?.message;
    setSaveError(
      firstMessage
        ? `Revise o campo ${firstField}: ${String(firstMessage)}`
        : "Existem campos invalidos. Revise os dados antes de salvar.",
    );
  };

  const buildPayload = (formData: OpportunityFormValues, asDraft: boolean) => {
    const currentUser = getAuthenticatedUser();
    const cleanedEntries = Object.entries(formData).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "number" && Number.isNaN(value)) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      return true;
    });
    const cleanFormData = Object.fromEntries(cleanedEntries);

    const selectedStatus = asDraft
      ? "DRAFT"
      : (formData.status ?? (isEditing ? loadedOpportunity?.status ?? "CAPTURED" : "CAPTURED"));

    return {
      ...cleanFormData,
      status: selectedStatus,
      tags: formData.tagsText
        ? formData.tagsText
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
      state: formData.state?.toUpperCase(),
      ...(currentUser ? { updatedByUserId: currentUser } : {}),
      ...(isEditing
        ? {}
        : {
            ...(currentUser ? { createdByUserId: currentUser } : {}),
          }),
    };
  };

  const save = async (formData: OpportunityFormValues, asDraft = false) => {
    const hasLocation =
      (formData.latitude !== undefined && formData.longitude !== undefined) ||
      Boolean(formData.street) ||
      (Boolean(formData.district) && Boolean(formData.city));

    if (!hasLocation) {
      alert("Informe ao menos coordenadas, logradouro ou bairro+cidade.");
      setStep(1);
      return;
    }

    setSaving(true);
    setUploadProgress(null);
    setSaveError(null);

    // Timeout por foto: cadastro (15s) + até 30s por anexo
    const safetyTimeoutMs = 15000 + files.length * 30000 + pendingAudios.length * 30000;
    const timeoutId = setTimeout(() => {
      setSaving(false);
      setUploadProgress(null);
      setSaveError("Tempo limite atingido. A solicitacao demorou muito. Verifique a conexao e tente novamente.");
    }, safetyTimeoutMs);

    try {
      const payload = buildPayload(formData, asDraft);
      const saved = isEditing
        ? await opportunitiesApi.update(opportunityId, payload)
        : await opportunitiesApi.create(payload);

      if (files.length > 0) {
        setUploadProgress({ uploaded: 0, total: files.length });
        const uploaded = await opportunitiesApi.uploadPhotos(saved.id, files, (uploadedCount, total) => {
          setUploadProgress({ uploaded: uploadedCount, total });
        });
        const primaryPhoto = uploaded[primaryIndex];
        if (primaryPhoto) {
          await opportunitiesApi.setPrimaryPhoto(saved.id, primaryPhoto.id);
        }
      }

      if (pendingAudios.length > 0) {
        setIsUploadingAudio(true);
        for (const audio of pendingAudios) {
          await opportunitiesApi.uploadAudio(saved.id, audio.file);
        }
        pendingAudios.forEach((audio) => URL.revokeObjectURL(audio.url));
        setPendingAudios([]);
        setIsUploadingAudio(false);
      }

      clearTimeout(timeoutId);
      setSaving(false);
      setUploadProgress(null);
      setSavedOpportunity({ id: saved.id, code: saved.code });
      setStep(6);
    } catch (error: any) {
      clearTimeout(timeoutId);
      setUploadProgress(null);

      // Log detalhado para debugging
      console.error("[Save Error]", {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message,
      });

      const message =
        error?.response?.data?.message ??
        error?.message ??
        `Nao foi possivel ${isEditing ? "atualizar" : "salvar"} a obra. Verifique conexao com a API e tente novamente.`;
      setSaveError(message);
      setIsUploadingAudio(false);
      setSaving(false);
    }
  };

  if (loadingOpportunity) {
    return <div className="page">Carregando obra para edição...</div>;
  }

  if (step === 6 && savedOpportunity) {
    return (
      <div className="page grid">
        <section className="card section-card surface-card text-center">
          <CheckCircle2 size={56} color="var(--color-success)" className="avatar-center" />
          <h2 className="page-title">{isEditing ? "Obra atualizada com sucesso" : "Obra salva com sucesso"}</h2>
          <p>Codigo do registro: <strong>{savedOpportunity.code}</strong></p>
          <div className="grid-1">
            <button className="btn btn-primary" onClick={() => navigate(`/opportunities/${savedOpportunity.id}`)}>Visualizar obra</button>
            <button className="btn btn-secondary" onClick={() => navigate("/new")}>Nova oportunidade</button>
            <button className="btn btn-ghost" onClick={() => navigate("/opportunities")}>Voltar para a lista</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <form
      className="page grid opportunity-wizard-form"
      onSubmit={handleSubmit(
        (formData) => save(formData as OpportunityFormValues, false),
        handleInvalidSubmit,
      )}
    >
      <section className="card section-card--compact surface-card">
        <div className="justify-between-wrap mb-8">
          <strong>Fluxo de captura</strong>
          <span>{progress}%</span>
        </div>
        {isEditing && (
          <div className="cluster wizard-shortcuts">
            <button type="button" className="btn btn-ghost btn-sm" onClick={goToPhotos}>
              <ImagePlus size={16} /> Ir para fotos
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={goToQualification}>
              <CheckCircle2 size={16} /> Ir para qualificação
            </button>
          </div>
        )}
        <div className="progress-track">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </section>

      {step === 1 && (
        <section className="card section-card surface-card">
          <h3 className="section-title">Etapa 1 - Captura Endereço</h3>
          <div className="grid">
            <button type="button" className="btn wizard-location-button" onClick={captureLocation} disabled={capturingLocation}>
              <MapPin size={18} /> {capturingLocation ? "Capturando localização..." : "Capturar minha localização"}
            </button>
            {locationHint && <span className="success-text">{locationHint}</span>}
            <div className="grid-2">
              <label>Latitude<input className="input" type="number" step="0.000001" {...register("latitude", { valueAsNumber: true })} /></label>
              <label>Longitude<input className="input" type="number" step="0.000001" {...register("longitude", { valueAsNumber: true })} /></label>
            </div>
            <label>
              CEP
              <input
                className="input"
                {...register("postalCode", {
                  onBlur: handlePostalCodeBlur,
                })}
              />
            </label>
            {postalCodeHint && (
              <span className={postalCodeHint.startsWith("CEP não encontrado") ? "error-text" : "success-text"}>
                {postalCodeHint}
              </span>
            )}
            <label>Logradouro<input className="input" {...register("street")} /></label>
            <div className="grid-2">
              <label>Numero<input className="input" {...register("number")} disabled={values.withoutNumber} /></label>
              <label>Bairro<input className="input" {...register("district")} /></label>
            </div>
            <div className="grid-2">
              <label>Cidade<input className="input" {...register("city")} /></label>
              <label>Estado<input className="input" maxLength={2} {...register("state")} /></label>
            </div>
            <label><input type="checkbox" {...register("withoutNumber")} /> Endereco sem numero</label>
            <label>Complemento<input className="input" {...register("complement")} /></label>
            {errors.state && <span className="error-text">Estado deve ter 2 letras.</span>}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="card section-card surface-card">
          <h3 className="section-title">Etapa 2 - Fotos</h3>
          <div className="grid">
            {isEditing && loadedOpportunity && (
              <div className="success-text">
                Esta obra já possui {loadedOpportunity.photos.length} foto{loadedOpportunity.photos.length === 1 ? "" : "s"} cadastrada{loadedOpportunity.photos.length === 1 ? "" : "s"}.
              </div>
            )}
            <label className="btn btn-link wizard-capture-button">
              <Camera size={18} /> Tirar foto
              <input type="file" accept="image/*" capture="environment" hidden onChange={(event) => addFiles(event.target.files)} />
            </label>
            <label className="btn btn-link wizard-capture-button wizard-capture-button--secondary">
              <ImagePlus size={18} /> Selecionar imagens
              <input type="file" accept="image/*" multiple hidden onChange={(event) => addFiles(event.target.files)} />
            </label>
            <div>{files.length} foto(s) anexada(s)</div>
            <div className="grid-auto-100">
              {files.map((file, index) => (
                <div key={`${file.name}-${index}`} className="card section-card--compact surface-card photo-card">
                  <button
                    type="button"
                    className={`photo-thumb-button${primaryIndex === index ? " is-primary" : ""}`}
                    onClick={() => setPrimaryIndex(index)}
                    aria-label={primaryIndex === index ? "Foto principal selecionada" : "Definir esta foto como principal"}
                    title={primaryIndex === index ? "Foto principal selecionada" : "Definir esta foto como principal"}
                  >
                    <img src={URL.createObjectURL(file)} alt={file.name} className="photo-thumb h-90" />
                    <span className={`photo-primary-badge${primaryIndex === index ? " is-active" : ""}`}>
                      {primaryIndex === index ? "Principal" : "Definir principal"}
                    </span>
                  </button>
                  <div className="justify-between mt-6">
                    <button
                      type="button"
                      className={`btn btn-ghost photo-primary-action${primaryIndex === index ? " is-active" : ""}`}
                      onClick={() => setPrimaryIndex(index)}
                    >
                      {primaryIndex === index ? "Foto principal" : "Definir principal"}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => removeFile(index)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {isEditing && existingPhotos.length > 0 && (
              <div className="stack-sm mt-6">
                <strong>Fotos já cadastradas</strong>
                <div className="grid-auto-160">
                  {existingPhotos.map((photo) => (
                    <div key={photo.id} className="card section-card--compact surface-card photo-card">
                      <button
                        type="button"
                        className={`photo-thumb-button${photo.isPrimary ? " is-primary" : ""}`}
                        onClick={() => {
                          if (!photo.isPrimary && photoBusyId !== photo.id) {
                            void handleSetPrimaryExistingPhoto(photo.id);
                          }
                        }}
                        disabled={photoBusyId === photo.id}
                        aria-label={photo.isPrimary ? "Foto principal da obra" : "Definir foto como principal"}
                        title={photo.isPrimary ? "Foto principal da obra" : "Definir foto como principal"}
                      >
                        <img
                          src={`${APP_CONFIG.uploadsBaseUrl}/${photo.relativePath}`}
                          alt={photo.originalName}
                          className="photo-thumb h-110"
                        />
                        <span className={`photo-primary-badge${photo.isPrimary ? " is-active" : ""}`}>
                          {photo.isPrimary ? "Principal" : "Definir principal"}
                        </span>
                      </button>
                      <div className="summary-box-sm mt-6">
                        {photo.isPrimary ? "Foto principal" : "Foto da obra"}
                      </div>
                      <div className="button-stack">
                        <button
                          type="button"
                          className={`btn btn-ghost photo-primary-action${photo.isPrimary ? " is-active" : ""}`}
                          onClick={() => handleSetPrimaryExistingPhoto(photo.id)}
                          disabled={photoBusyId === photo.id || photo.isPrimary}
                        >
                          {photo.isPrimary ? "Já é a principal" : photoBusyId === photo.id ? "Atualizando..." : "Definir principal"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => handleDeleteExistingPhoto(photo.id)}
                          disabled={photoBusyId === photo.id}
                        >
                          {photoBusyId === photo.id ? "Removendo..." : "Remover foto"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {photoActionError && <span className="error-text">{photoActionError}</span>}

            <div className="stack-sm mt-6">
              <strong>Audio</strong>
              <div className="audio-recorder-player">
                <div className="audio-recorder-player-main">
                  <button
                    type="button"
                    className={`btn audio-record-button audio-record-button--touch${isRecordingAudio ? " is-recording" : ""}`}
                    onClick={isRecordingAudio ? handleStopAudioRecording : handleStartAudioRecording}
                    disabled={saving || isUploadingAudio}
                    aria-label={isRecordingAudio ? "Parar gravacao" : "Iniciar gravacao"}
                  >
                    {isRecordingAudio ? <Square size={16} /> : <Mic size={16} />}
                  </button>

                  <div className="audio-recorder-info">
                    <div className="audio-recorder-status-row">
                      <span className={`audio-recorder-status${isRecordingAudio ? " is-recording" : ""}`}>
                        {isRecordingAudio ? "Gravando" : "Pronto para gravar"}
                      </span>
                      <span className="audio-recorder-time">{formatRecordingTime(recordingSeconds)} / 01:00</span>
                    </div>

                    <div className="audio-recorder-controls">
                      <button
                        type="button"
                        className={`audio-sensitivity-toggle${isHighSensitivityEnabled ? " is-active" : ""}`}
                        aria-pressed={isHighSensitivityEnabled}
                        onClick={() => setIsHighSensitivityEnabled((value) => !value)}
                      >
                        {isHighSensitivityEnabled ? "Sensibilidade alta" : "Sensibilidade normal"}
                      </button>
                    </div>

                    <div className={`audio-recorder-wave${isRecordingAudio ? " is-live" : ""}`} aria-hidden="true">
                      {recordingWaveform.map((level, index) => (
                        <span key={`wave-${index}`} style={{ height: `${Math.round(level * 100)}%` }} />
                      ))}
                    </div>

                    <div className="audio-recorder-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={recordingProgress}>
                      <div className="audio-recorder-progress-fill" style={{ width: `${recordingProgress}%` }} />
                    </div>
                  </div>
                </div>

                <span className="muted audio-recorder-hint">
                  {isRecordingAudio ? "Toque para parar e anexar automaticamente." : "Toque para gravar (maximo de 60 segundos)."}
                </span>
              </div>

              <div className="grid-2 wizard-audio-actions">
                <label className="btn btn-link wizard-capture-button wizard-capture-button--secondary">
                  <ImagePlus size={18} /> Selecionar audio
                  <input type="file" accept="audio/*" multiple hidden onChange={(event) => onSelectAudioFiles(event.target.files)} />
                </label>
              </div>

              {!isSecureContextForMic && (
                <span className="muted" style={{ fontSize: 12 }}>
                  Gravacao de audio exige HTTPS ou localhost.
                </span>
              )}

              {pendingAudios.length > 0 && (
                <div className="stack-sm">
                  <span className="success-text">{pendingAudios.length} audio(s) pronto(s) para anexar no salvar.</span>
                  {pendingAudios.map((audio) => (
                    <div key={audio.id} className="card section-card--compact surface-card">
                      <div className="justify-between-wrap mb-8">
                        <span className="muted wizard-audio-meta" style={{ fontSize: 12 }}>
                          {audio.file.name} - {formatAudioSize(audio.file.size)}
                        </span>
                        <button type="button" className="btn btn-ghost" onClick={() => handleRemovePendingAudio(audio.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <audio className="opportunity-audio-player" controls preload="metadata" src={audio.url} />
                    </div>
                  ))}
                </div>
              )}

              {isEditing && existingAudios.length > 0 && (
                <div className="stack-sm">
                  <span className="muted" style={{ fontSize: 12 }}>Audios já anexados</span>
                  {existingAudios.map((audio) => (
                    <div key={audio.id} className="card section-card--compact surface-card">
                      <div className="justify-between-wrap mb-8">
                        <span className="muted wizard-audio-meta" style={{ fontSize: 12 }}>
                          {audio.originalName} - {formatAudioSize(audio.size)}
                        </span>
                        <button type="button" className="btn btn-ghost" onClick={() => handleDeleteExistingAudio(audio.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <audio
                        className="opportunity-audio-player"
                        controls
                        preload="metadata"
                        src={`${APP_CONFIG.uploadsBaseUrl}/${audio.relativePath}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              {audioActionError && <span className="error-text">{audioActionError}</span>}
            </div>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="card section-card surface-card">
          <h3 className="section-title">Etapa 3 - Salvar</h3>
          <div className="grid">
            <div className="summary-box-sm">
              Você já pode salvar agora com endereço e fotos. Se quiser, use <strong>Preencher qualificação</strong> para incluir mais dados antes de salvar.
            </div>
            <div><strong>Endereco:</strong> {values.street || "-"} {values.number || ""}, {values.district || "-"} - {values.city || "-"}</div>
            <div><strong>Coordenadas:</strong> {values.latitude ?? "-"}, {values.longitude ?? "-"}</div>
            <div><strong>Qtd. fotos:</strong> {existingPhotos.length + files.length}</div>
            <div><strong>Qtd. audios:</strong> {existingAudios.length + pendingAudios.length}</div>
            <div className="muted" style={{ fontSize: 13 }}>
              Depois você pode complementar qualquer informação na edição da obra.
            </div>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="card section-card surface-card">
          <h3 className="section-title">Etapa 4 - Contato e observações</h3>
          <div className="grid">
            <label>Nome do contato<input className="input" {...register("contactName")} /></label>
            <label>Telefone do contato<input className="input" {...register("contactPhone")} /></label>
            <label>E-mail do contato<input className="input" {...register("contactEmail")} /></label>
            {errors.contactEmail && <span className="error-text">E-mail inválido.</span>}
            {!showQualificationFlow && <label>Observações<textarea className="textarea" {...register("notes")} /></label>}

            <button
              type="button"
              className="btn btn-ghost wizard-advanced-toggle"
              onClick={() => setShowAdvancedContact((value) => !value)}
            >
              {showAdvancedContact ? "Ocultar campos extras" : "Mostrar campos extras"}
            </button>

            {showAdvancedContact && (
              <>
                <label>Próxima ação<input className="input" {...register("nextAction")} /></label>
                <label>Data da próxima ação<input className="input" type="date" {...register("nextActionDate")} /></label>
                <label>Tags (separadas por virgula)<input className="input" {...register("tagsText")} /></label>
              </>
            )}
          </div>
        </section>
      )}

      {step === 5 && (
        <section className="card section-card surface-card">
          <h3 className="section-title">Etapa 5 - Obra e potencial</h3>
          <div className="grid">
            <label>Título da obra<input className="input" {...register("title")} /></label>
            <label>Tipo da obra<select className="select" {...register("constructionType")}>{constructionTypeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label>Estágio<select className="select" {...register("constructionStage")}>{constructionStageOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label>Potencial comercial<select className="select" {...register("commercialPotential")}>{commercialPotentialOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>

            <button
              type="button"
              className="btn btn-ghost wizard-advanced-toggle"
              onClick={() => setShowAdvancedWork((value) => !value)}
            >
              {showAdvancedWork ? "Ocultar campos extras" : "Mostrar campos extras"}
            </button>

            {showAdvancedWork && (
              <>
                <label>Status no funil<select className="select" {...register("status")}>{statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                <label className="checkbox-label"><input type="checkbox" {...register("isTest")} /> Marcar como teste (não exibe na listagem padrão)</label>
              </>
            )}
          </div>
        </section>
      )}

      {step <= 2 && (
        <section className="grid-2 wizard-actions">
          <button type="button" className="btn btn-ghost" disabled={step === 1 || saving} onClick={() => setStep((value) => Math.max(1, value - 1))}>
            Voltar
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setStep((value) => Math.min(3, value + 1))}>
            Próximo
          </button>
        </section>
      )}

      {step === 3 && (
        <section className="grid-2 wizard-actions wizard-actions--stack">
          <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => setStep(2)}>
            Voltar para fotos
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={handleSubmit(
              (formData) => save(formData as OpportunityFormValues, false),
              handleInvalidSubmit,
            )}
          >
            {saving
              ? uploadProgress
                ? `Enviando foto ${uploadProgress.uploaded}/${uploadProgress.total}...`
                : isUploadingAudio
                  ? "Enviando audios..."
                : isEditing
                  ? "Atualizando..."
                  : "Salvando..."
              : "Salvar rápido"}
          </button>
          <button
            type="button"
            className="btn btn-ghost wizard-draft-button"
            disabled={saving}
            onClick={() => {
              setShowQualificationFlow(true);
              setStep(4);
            }}
          >
            Preencher qualificação
          </button>
        </section>
      )}

      {step === 4 && (
        <section className="grid-2 wizard-actions">
          <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => setStep(3)}>
            Voltar
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setStep(5)}>
            Próximo
          </button>
        </section>
      )}

      {step === 5 && (
        <section className="grid-2 wizard-actions">
          <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => setStep(4)}>
            Voltar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={handleSubmit(
              (formData) => save(formData as OpportunityFormValues, false),
              handleInvalidSubmit,
            )}
          >
            {saving
              ? uploadProgress
                ? `Enviando foto ${uploadProgress.uploaded}/${uploadProgress.total}...`
                : isUploadingAudio
                  ? "Enviando audios..."
                : isEditing
                  ? "Atualizando..."
                  : "Salvando..."
              : isEditing
                ? "Atualizar obra"
                : "Salvar completo"}
          </button>
        </section>
      )}
      {saveError && <div className="error-text">{saveError}</div>}
    </form>
  );
}
