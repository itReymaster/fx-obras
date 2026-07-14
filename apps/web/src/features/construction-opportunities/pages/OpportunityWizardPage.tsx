import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, CheckCircle2, Crosshair, ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FocusEvent } from "react";
import type { FieldErrors } from "react-hook-form";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import {
  commercialPotentialOptions,
  constructionStageOptions,
  constructionTypeOptions,
  labels,
  statusOptions,
} from "../../../utils/labels";
import { APP_CONFIG } from "../../../config/app";
import { getAuthenticatedUser } from "../../../config/users";
import { opportunityFormSchema, type OpportunityFormValues } from "../schemas/opportunity-form.schema";
import { opportunitiesApi } from "../services/opportunities-api";
import type { Opportunity } from "../types/opportunity.types";

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

    void opportunitiesApi
      .getById(opportunityId)
      .then((opportunity) => {
        if (cancelled) return;

        setLoadedOpportunity(opportunity);
        setPhotoActionError(null);
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

  const values = watch();

  const progress = useMemo(() => Math.round((step / 4) * 100), [step]);

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
    const safetyTimeoutMs = 15000 + files.length * 30000;
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

      clearTimeout(timeoutId);
      setSaving(false);
      setUploadProgress(null);
      setSavedOpportunity({ id: saved.id, code: saved.code });
      setStep(5);
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
      setSaving(false);
    }
  };

  if (loadingOpportunity) {
    return <div className="page">Carregando obra para edição...</div>;
  }

  if (step === 5 && savedOpportunity) {
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
      className="page grid"
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
        <div className="progress-track">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </section>

      {step === 1 && (
        <section className="card section-card surface-card">
          <h3 className="section-title">Etapa 1 - Localização e endereço</h3>
          <div className="grid">
            <button type="button" className="btn btn-secondary" onClick={captureLocation} disabled={capturingLocation}>
              <Crosshair size={18} /> {capturingLocation ? "Capturando localização..." : "Capturar minha localização"}
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
          <h3 className="section-title">{isEditing ? "Etapa 2 - Fotografias e anexos" : "Etapa 2 - Fotografias"}</h3>
          <div className="grid">
            {isEditing && loadedOpportunity && (
              <div className="success-text">
                Esta obra já possui {loadedOpportunity.photos.length} foto{loadedOpportunity.photos.length === 1 ? "" : "s"} cadastrada{loadedOpportunity.photos.length === 1 ? "" : "s"}.
              </div>
            )}
            <label className="btn btn-secondary btn-link">
              <Camera size={18} /> Tirar foto
              <input type="file" accept="image/*" capture="environment" hidden onChange={(event) => addFiles(event.target.files)} />
            </label>
            <label className="btn btn-ghost btn-link">
              <ImagePlus size={18} /> Selecionar imagens
              <input type="file" accept="image/*" multiple hidden onChange={(event) => addFiles(event.target.files)} />
            </label>
            <div>{files.length} foto(s) anexada(s)</div>
            <div className="grid-auto-100">
              {files.map((file, index) => (
                <div key={`${file.name}-${index}`} className="card section-card--compact surface-card photo-card">
                  <img src={URL.createObjectURL(file)} alt={file.name} className="photo-thumb h-90" />
                  <div className="justify-between mt-6">
                    <button type="button" className="btn btn-ghost" onClick={() => setPrimaryIndex(index)}>
                      {primaryIndex === index ? "Principal" : "Definir"}
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
                      <img
                        src={`${APP_CONFIG.uploadsBaseUrl}/${photo.relativePath}`}
                        alt={photo.originalName}
                        className="photo-thumb h-110"
                      />
                      <div className="summary-box-sm mt-6">
                        {photo.isPrimary ? "Foto principal" : "Foto da obra"}
                      </div>
                      <div className="button-stack">
                        <button
                          type="button"
                          className="btn btn-ghost"
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
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="card section-card surface-card">
          <h3 className="section-title">Etapa 3 - Informações gerais</h3>
          <div className="grid">
            <label>Título da obra<input className="input" {...register("title")} /></label>
            <label>Tipo da obra<select className="select" {...register("constructionType")}>{constructionTypeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label>Estágio<select className="select" {...register("constructionStage")}>{constructionStageOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label>Potencial comercial<select className="select" {...register("commercialPotential")}>{commercialPotentialOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label>Status no funil<select className="select" {...register("status")}>{statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label>Observações<textarea className="textarea" {...register("notes")} /></label>
            <label>Contato<input className="input" {...register("contactName")} /></label>
            <label>Telefone<input className="input" {...register("contactPhone")} /></label>
            <label>E-mail<input className="input" {...register("contactEmail")} /></label>
            {errors.contactEmail && <span className="error-text">E-mail inválido.</span>}
            <label>Próxima ação<input className="input" {...register("nextAction")} /></label>
            <label>Data da próxima ação<input className="input" type="date" {...register("nextActionDate")} /></label>
            <label>Tags (separadas por virgula)<input className="input" {...register("tagsText")} /></label>
            <label className="checkbox-label"><input type="checkbox" {...register("isTest")} /> Marcar como teste (não exibe na listagem padrão)</label>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="card section-card surface-card">
          <h3 className="section-title">Etapa 4 - Revisão e confirmação</h3>
          <div className="grid">
            <div><strong>Título:</strong> {values.title || "(será gerado automaticamente)"}</div>
            <div><strong>Endereco:</strong> {values.street || "-"} {values.number || ""}, {values.district || "-"} - {values.city || "-"}</div>
            <div><strong>Coordenadas:</strong> {values.latitude ?? "-"}, {values.longitude ?? "-"}</div>
            <div><strong>Tipo/Estagio:</strong> {labels.constructionType(values.constructionType)} / {labels.constructionStage(values.constructionStage)}</div>
            <div><strong>Potencial:</strong> {labels.commercialPotential(values.commercialPotential)}</div>
            <div><strong>Observações:</strong> {values.notes || "-"}</div>
            <div><strong>Qtd. fotos:</strong> {existingPhotos.length + files.length}</div>
            <div><strong>Contato:</strong> {values.contactName || "-"}</div>
            <div><strong>Próxima ação:</strong> {values.nextAction || "-"}</div>
            <div><strong>Status no funil:</strong> {labels.status(values.status)}</div>
            <div><strong>Tipo de registro:</strong> {values.isTest ? "⚠️ Teste (não exibe por padrão)" : "✓ Registro real"}</div>
          </div>
        </section>
      )}

      <section className="grid-2 wizard-actions">
        <button type="button" className="btn btn-ghost" disabled={step === 1 || saving} onClick={() => setStep((value) => Math.max(1, value - 1))}>
          Voltar
        </button>
        {step < 4 ? (
          <button type="button" className="btn btn-primary" onClick={() => setStep((value) => Math.min(4, value + 1))}>
            Avancar
          </button>
        ) : saveError ? (
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
                : "Tentando novamente..."
              : "Tentar novamente"}
          </button>
        ) : (
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving
              ? uploadProgress
                ? `Enviando foto ${uploadProgress.uploaded}/${uploadProgress.total}...`
                : isEditing
                  ? "Atualizando..."
                  : "Salvando..."
              : isEditing
                ? "Atualizar obra"
                : "Salvar obra"}
          </button>
        )}
      </section>
      {saveError && <div className="error-text">{saveError}</div>}
      {step === 4 && !isEditing && (
        <button
          type="button"
          className="btn btn-secondary wizard-draft-button"
          disabled={saving}
          onClick={handleSubmit(
            (formData) => save(formData as OpportunityFormValues, true),
            handleInvalidSubmit,
          )}
        >
          Salvar como rascunho
        </button>
      )}
    </form>
  );
}
