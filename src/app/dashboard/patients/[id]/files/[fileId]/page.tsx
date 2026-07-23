"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const RichTextEditor = dynamic(
  () => import("@/components/RichTextEditor"),
  { ssr: false }
);

interface WordFile {
  id: number;
  patientId: number;
  originalName: string;
  mimeType: string;
  size: number;
  editable: boolean;
  editableContent: string | null;
  warnings: string[];
  createdAt: string;
  updatedAt: string;
}

export default function WordFilePage({
  params,
}: {
  params: Promise<{ id: string; fileId: string }>;
}) {
  const { id: patientId, fileId } = use(params);
  const router = useRouter();
  const [file, setFile] = useState<WordFile | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const fetchFile = useCallback(async () => {
    try {
      const res = await fetch(`/api/files/${fileId}`);
      if (!res.ok) {
        router.push(`/dashboard/patients/${patientId}`);
        return;
      }
      const data: WordFile = await res.json();
      if (String(data.patientId) !== patientId || !data.editable) {
        router.push(`/dashboard/patients/${patientId}`);
        return;
      }
      setFile(data);
      setContent(data.editableContent || "<p></p>");
    } catch {
      setError("Не удалось открыть Word-документ.");
    } finally {
      setLoading(false);
    }
  }, [fileId, patientId, router]);

  useEffect(() => {
    void fetchFile();
  }, [fetchFile]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Не удалось сохранить изменения.");
        return;
      }
      const data = await res.json();
      setFile((current) =>
        current ? { ...current, updatedAt: data.updatedAt } : current
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Ошибка соединения при сохранении.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-400">
        Подготовка Word-документа...
      </div>
    );
  }

  if (!file) {
    return (
      <div className="p-8">
        <div className="p-4 rounded-lg bg-red-50 text-red-700">
          {error || "Файл не найден"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/dashboard" className="hover:text-blue-600">
          Пациенты
        </Link>
        <span>→</span>
        <Link
          href={`/dashboard/patients/${patientId}`}
          className="hover:text-blue-600"
        >
          Карточка пациента
        </Link>
        <span>→</span>
        <span className="text-slate-700 truncate">{file.originalName}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🟦</span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {file.originalName}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Word DOCX · редакция сохраняется отдельно от оригинала
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saved && (
            <span className="text-sm text-green-600 font-medium mr-1">
              ✓ Сохранено
            </span>
          )}
          <a
            href={`/api/files/${fileId}/download`}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            Скачать оригинал
          </a>
          <a
            href={`/api/files/${fileId}/export`}
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium transition-colors"
          >
            Экспорт редакции .docx
          </a>
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            {editing ? "👁 Режим чтения" : "✏️ Редактировать"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              {saving ? "Сохранение..." : "💾 Сохранить"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {file.warnings.length > 0 && (
        <details className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <summary className="font-medium cursor-pointer">
            Замечания при чтении Word ({file.warnings.length})
          </summary>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            {file.warnings.map((warning, index) => (
              <li key={`${warning}-${index}`}>{warning}</li>
            ))}
          </ul>
        </details>
      )}

      {editing ? (
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="Содержимое Word-документа..."
        />
      ) : (
        <div className="mx-auto max-w-[900px] min-h-[900px] bg-white border border-slate-200 shadow-sm rounded-sm px-12 py-14">
          <div
            className="word-preview prose prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-5 text-xs text-slate-400">
        <span>Загружен: {new Date(file.createdAt).toLocaleString("ru-RU")}</span>
        <span>Редакция: {new Date(file.updatedAt).toLocaleString("ru-RU")}</span>
      </div>
    </div>
  );
}
