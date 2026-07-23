"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface PatientFile {
  id: number;
  patientId: number;
  originalName: string;
  mimeType: string;
  size: number;
  editable: boolean;
  warningsCount: number;
  createdAt: string;
  updatedAt: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function fileIcon(file: PatientFile): string {
  const name = file.originalName.toLowerCase();
  if (name.endsWith(".docx") || name.endsWith(".doc")) return "🟦";
  if (name.endsWith(".pdf")) return "📕";
  if (file.mimeType.startsWith("image/")) return "🖼️";
  if (name.endsWith(".xls") || name.endsWith(".xlsx")) return "📗";
  return "📎";
}

export default function PatientFiles({ patientId }: { patientId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}/files`);
      if (res.ok) setFiles(await res.json());
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const uploadFiles = async (selected: FileList | File[]) => {
    setError("");
    for (const file of Array.from(selected)) {
      if (file.size > 20 * 1024 * 1024) {
        setError(`«${file.name}» больше 20 МБ и не был загружен.`);
        continue;
      }

      setUploading(file.name);
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`/api/patients/${patientId}/files`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error || `Не удалось загрузить «${file.name}».`);
        }
      } catch {
        setError(`Ошибка соединения при загрузке «${file.name}».`);
      }
    }
    setUploading("");
    if (inputRef.current) inputRef.current.value = "";
    await fetchFiles();
  };

  const deleteFile = async (file: PatientFile) => {
    if (!confirm(`Удалить файл «${file.originalName}»?`)) return;
    const res = await fetch(`/api/files/${file.id}`, { method: "DELETE" });
    if (res.ok) {
      setFiles((current) => current.filter((item) => item.id !== file.id));
    } else {
      setError("Не удалось удалить файл.");
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            📁 Файлы пациента ({files.length})
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Word-файлы DOCX можно просматривать и редактировать в системе
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={Boolean(uploading)}
          className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          {uploading ? "Загрузка..." : "+ Загрузить файлы"}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void uploadFiles(event.target.files);
          }}
        />
      </div>

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget === event.target) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (event.dataTransfer.files.length) {
            void uploadFiles(event.dataTransfer.files);
          }
        }}
        className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
          dragging
            ? "border-blue-500 bg-blue-50"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        <p className="text-sm text-slate-600">
          Перетащите файлы сюда или нажмите «Загрузить файлы»
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Максимум 20 МБ на файл · редактирование доступно для DOCX
        </p>
        {uploading && (
          <p className="text-sm text-blue-600 font-medium mt-3">
            Загружается: {uploading}
          </p>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-center text-slate-400 py-8">Загрузка файлов...</p>
      ) : files.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-8">
          В папке пациента пока нет загруженных файлов
        </p>
      ) : (
        <div className="divide-y divide-slate-100 mt-5">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl" aria-hidden>
                  {fileIcon(file)}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {file.originalName}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                    <span>{formatSize(file.size)}</span>
                    <span>{new Date(file.createdAt).toLocaleString("ru-RU")}</span>
                    {file.editable && (
                      <span className="text-blue-600 font-medium">DOCX · редактор</span>
                    )}
                    {file.warningsCount > 0 && (
                      <span className="text-amber-600">Есть замечания конвертации</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {file.editable && (
                  <Link
                    href={`/dashboard/patients/${patientId}/files/${file.id}`}
                    className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Открыть в редакторе
                  </Link>
                )}
                <a
                  href={`/api/files/${file.id}/download`}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Скачать
                </a>
                <button
                  type="button"
                  onClick={() => void deleteFile(file)}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm transition-colors cursor-pointer"
                  title="Удалить файл"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
