"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_COLORS,
  type DocumentType,
} from "@/lib/types";

const RichTextEditor = dynamic(
  () => import("@/components/RichTextEditor"),
  { ssr: false }
);

interface Doc {
  id: number;
  patientId: number;
  type: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function DocumentEditorPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const { id: patientId, docId } = use(params);
  const router = useRouter();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const fetchDoc = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${docId}`);
      if (res.ok) {
        const data = await res.json();
        setDoc(data);
        setTitle(data.title);
        setContent(data.content);
      } else {
        router.push(`/dashboard/patients/${patientId}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [docId, patientId, router]);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ru">
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            body {
              font-family: 'Times New Roman', serif;
              font-size: 14px;
              line-height: 1.6;
              max-width: 210mm;
              margin: 0 auto;
              padding: 20mm;
              color: #000;
            }
            h1, h2, h3 { font-weight: bold; }
            h1 { font-size: 18px; }
            h2 { font-size: 16px; }
            h3 { font-size: 14px; }
            table {
              border-collapse: collapse;
              width: 100%;
            }
            table td, table th {
              border: 1px solid #000;
              padding: 6px 10px;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-400">
        Загрузка документа...
      </div>
    );
  }

  if (!doc) return null;

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
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
        <span className="text-slate-700">{doc.title}</span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              DOCUMENT_TYPE_COLORS[doc.type as DocumentType]
            }`}
          >
            {DOCUMENT_TYPE_LABELS[doc.type as DocumentType]}
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-bold text-slate-900 bg-transparent border-none outline-none focus:ring-0 w-96"
          />
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm text-green-600 font-medium">
              ✓ Сохранено
            </span>
          )}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            {showPreview ? "✏️ Редактор" : "👁 Превью"}
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            🖨 Печать
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            {saving ? "Сохранение..." : "💾 Сохранить"}
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      {showPreview ? (
        <div className="bg-white border border-slate-300 rounded-lg p-8 max-w-4xl">
          <div
            className="prose prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      ) : (
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="Начните вводить текст документа..."
        />
      )}

      {/* Info */}
      <div className="mt-6 text-xs text-slate-400 flex gap-6">
        <span>
          Создан: {new Date(doc.createdAt).toLocaleString("ru-RU")}
        </span>
        <span>
          Изменён: {new Date(doc.updatedAt).toLocaleString("ru-RU")}
        </span>
      </div>
    </div>
  );
}
