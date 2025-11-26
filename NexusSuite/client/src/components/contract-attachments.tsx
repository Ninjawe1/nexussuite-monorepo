import React, { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Download, Eye } from "lucide-react";


interface ContractAttachmentsProps {
  contractId: string;
}

interface ContractFile {
  id: string;
  tenantId: string;
  contractId: string;
  fileName: string;
  contentType?: string | null;
  base64?: string | null;
  createdAt?: string | null;
}

export const ContractAttachments: React.FC<ContractAttachmentsProps> = ({
  contractId,
}) => {

  const qc = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isReading, setIsReading] = useState(false);

  const queryKey = useMemo(() => ["contract-files", contractId], [contractId]);


  const { data, isLoading, error } = useQuery<ContractFile[]>({
    queryKey,
    queryFn: async () => {
      const res = await apiRequest(`/api/contracts/${contractId}/files`, "GET");

      return res.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (payload: {
      fileName: string;
      base64: string;
      contentType?: string;
    }) => {
      const res = await apiRequest(
        `/api/contracts/${contractId}/files`,
        "POST",
        payload,
      );

      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      setSelectedFile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await apiRequest(
        `/api/contracts/${contractId}/files/${fileId}`,
        "DELETE",
      );

      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setSelectedFile(f);
  }, []);

  const onUpload = useCallback(async () => {
    if (!selectedFile) return;
    setIsReading(true);
    try {
      const reader = new FileReader();
      const base64: string = await new Promise((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });
      await uploadMutation.mutateAsync({
        fileName: selectedFile.name,
        base64,
        contentType: selectedFile.type,
      });
    } catch (err) {
      console.error(err);
      alert((err as Error)?.message || "Failed to upload file");

    } finally {
      setIsReading(false);
    }
  }, [selectedFile, uploadMutation]);

  const onDelete = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err) {
        console.error(err);
        alert((err as Error)?.message || "Failed to delete file");
      }
    },
    [deleteMutation],

  );

  const onDownload = useCallback((file: ContractFile) => {
    if (!file.base64) return;
    const link = document.createElement("a");
    link.href = file.base64;
    link.download = file.fileName || "download";

    document.body.appendChild(link);
    link.click();
    link.remove();
  }, []);

  const onPreview = useCallback((file: ContractFile) => {
    if (!file.base64) return;
    const w = window.open("");
    if (w) {
      const isImage = (file.contentType || "").startsWith("image/");
      const isPdf = (file.contentType || "").includes("pdf");

      const content = isImage
        ? `<img src="${file.base64}" style="max-width:100%;height:auto" />`
        : isPdf
          ? `<iframe src="${file.base64}" style="width:100%;height:100%" frameborder="0"></iframe>`
          : `<a href="${file.base64}" download>Download ${file.fileName}</a>`;
      w.document.write(
        `<!doctype html><title>${file.fileName}</title>${content}`,
      );

      w.document.close();
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input type="file" onChange={onFileChange} />
        <Button
          onClick={onUpload}
          disabled={!selectedFile || uploadMutation.isPending || isReading}
        >
          {uploadMutation.isPending || isReading ? "Uploading..." : "Upload"}

        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Loading attachments...
        </div>
      )}
      {error && (
        <div className="text-sm text-red-600">Failed to load attachments</div>
      )}

      {(data?.length ?? 0) > 0 ? (
        <div className="space-y-2">
          {data!.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between rounded border p-2"
            >

              <div className="truncate">
                <div className="font-medium truncate">{file.fileName}</div>
                {file.createdAt && (
                  <div className="text-xs text-muted-foreground">
                    Uploaded {new Date(file.createdAt).toLocaleString()}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPreview(file)}
                  title="Preview"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDownload(file)}
                  title="Download"
                >

                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(file.id)}
                  title="Delete"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No attachments yet</div>
      )}
    </div>
  );
};
