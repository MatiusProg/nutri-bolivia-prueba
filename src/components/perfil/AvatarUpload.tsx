import { useState, useRef } from "react";
import { Camera, Loader2, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AvatarUploadProps {
  avatarActual: string | null;
  onAvatarCargado: (url: string) => void;
  onAvatarEliminado: () => void;
}

export function AvatarUpload({
  avatarActual,
  onAvatarCargado,
  onAvatarEliminado,
}: AvatarUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(avatarActual);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comprimir imagen para avatar (máx 512px)
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        const MAX_SIZE = 512;
        let { width, height } = img;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = (height * MAX_SIZE) / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = (width * MAX_SIZE) / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.9
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }

    // Validar tamaño (5MB máx)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar 5MB");
      return;
    }

    setUploading(true);

    try {
      // Comprimir imagen
      const compressedFile = await compressImage(file);

      // Generar nombre único
      const timestamp = Date.now();
      const fileExt = "jpg";
      const filePath = `avatares/${user.id}/${timestamp}.${fileExt}`;

      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("recetas-imagenes")
        .upload(filePath, compressedFile, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from("recetas-imagenes").getPublicUrl(filePath);

      setPreview(publicUrl);
      onAvatarCargado(publicUrl);
      toast.success("Avatar actualizado");
    } catch (error) {
      console.error("Error subiendo avatar:", error);
      toast.error("Error al subir el avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onAvatarEliminado();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar con overlay de cámara */}
      <div className="relative group">
        <div
          onClick={handleClick}
          className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-primary/20 cursor-pointer transition-all hover:border-primary/50 bg-muted"
        >
          {uploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : preview ? (
            <img
              src={preview}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <User className="h-12 w-12 text-muted-foreground" />
            </div>
          )}

          {/* Overlay de cámara */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* Input oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
      </div>

      {/* Botón eliminar */}
      {preview && !uploading && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Eliminar foto
        </Button>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Clic para cambiar foto
        <br />
        JPG, PNG (máx 5MB)
      </p>
    </div>
  );
}
