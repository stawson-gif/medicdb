"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_COLORS,
  type DocumentType,
} from "@/lib/types";

interface Patient {
  id: number;
  fullName: string;
  birthDate: string;
  gender: string;
  address: string | null;
  phone: string | null;
  insuranceNumber: string | null;
  diagnosis: string | null;
}

interface Doc {
  id: number;
  patientId: number;
  type: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export default function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, dRes] = await Promise.all([
        fetch(`/api/patients/${id}`),
        fetch(`/api/patients/${id}/documents`),
      ]);
      if (pRes.ok) setPatient(await pRes.json());
      if (dRes.ok) setDocuments(await dRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleDeleteDoc = async (docId: number) => {
    if (!confirm("Удалить документ?")) return;
    const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    if (res.ok) fetchAll();
  };

  const handleGenerateTemplate = async (type: DocumentType) => {
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: Number(id), type }),
      });
      if (!res.ok) return;
      const template = await res.json();

      // Create document from template
      const createRes = await fetch(`/api/patients/${id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: template.title,
          content: template.content,
        }),
      });
      if (createRes.ok) {
        const doc = await createRes.json();
        router.push(`/dashboard/patients/${id}/documents/${doc.id}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-400">
        Загрузка...
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Пациент не найден</p>
        <Link
          href="/dashboard"
          className="text-blue-600 hover:underline mt-4 inline-block"
        >
          ← Назад
        </Link>
      </div>
    );
  }

  const age =
    new Date().getFullYear() - new Date(patient.birthDate).getFullYear();

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <Link
        href="/dashboard"
        className="text-blue-600 hover:underline text-sm mb-6 inline-block"
      >
        ← Назад к списку пациентов
      </Link>

      {/* Patient info header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-5">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                patient.gender === "male"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-pink-100 text-pink-700"
              }`}
            >
              {patient.fullName.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {patient.fullName}
              </h1>
              <div className="flex gap-5 text-sm text-slate-500 mt-2">
                <span>
                  🎂 {new Date(patient.birthDate).toLocaleDateString("ru-RU")}{" "}
                  ({age} лет)
                </span>
                <span>
                  {patient.gender === "male" ? "♂ Мужской" : "♀ Женский"}
                </span>
                {patient.phone && <span>📞 {patient.phone}</span>}
              </div>
              {(patient.address || patient.insuranceNumber) && (
                <div className="flex gap-5 text-sm text-slate-500 mt-1">
                  {patient.address && <span>📍 {patient.address}</span>}
                  {patient.insuranceNumber && (
                    <span>🏥 {patient.insuranceNumber}</span>
                  )}
                </div>
              )}
              {patient.diagnosis && (
                <p className="text-sm text-slate-700 mt-2">
                  <span className="font-medium">Диагноз:</span>{" "}
                  {patient.diagnosis}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowEdit(true)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            ✏️ Редактировать
          </button>
        </div>
      </div>

      {/* Quick document generation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          📝 Быстрая генерация документа
        </h2>
        <div className="flex flex-wrap gap-3">
          {(
            ["journal", "initial", "referral", "discharge"] as DocumentType[]
          ).map((type) => (
            <button
              key={type}
              onClick={() => handleGenerateTemplate(type)}
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              {type === "journal" && "📋 "}
              {type === "initial" && "🔍 "}
              {type === "referral" && "➡️ "}
              {type === "discharge" && "📄 "}
              {DOCUMENT_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Documents header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-900">
          📁 Документы ({documents.length})
        </h2>
        <button
          onClick={() => setShowNewDoc(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
        >
          <span>+</span> Новый документ
        </button>
      </div>

      {/* Document list */}
      {documents.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl">📂</span>
          <p className="text-slate-500 mt-3">
            Документов пока нет. Создайте первый документ.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      DOCUMENT_TYPE_COLORS[doc.type as DocumentType]
                    }`}
                  >
                    {DOCUMENT_TYPE_LABELS[doc.type as DocumentType]}
                  </div>
                  <div>
                    <Link
                      href={`/dashboard/patients/${id}/documents/${doc.id}`}
                      className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
                    >
                      {doc.title}
                    </Link>
                    <p className="text-xs text-slate-400 mt-1">
                      Изменён:{" "}
                      {new Date(doc.updatedAt).toLocaleString("ru-RU")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/patients/${id}/documents/${doc.id}`}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Открыть
                  </Link>
                  <button
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Document Modal */}
      {showNewDoc && (
        <NewDocumentModal
          onClose={() => setShowNewDoc(false)}
          onCreated={(docId) => {
            setShowNewDoc(false);
            router.push(`/dashboard/patients/${id}/documents/${docId}`);
          }}
          patientId={id}
        />
      )}

      {/* Edit Patient Modal */}
      {showEdit && (
        <EditPatientModal
          patient={patient}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}

function NewDocumentModal({
  onClose,
  onCreated,
  patientId,
}: {
  onClose: () => void;
  onCreated: (docId: number) => void;
  patientId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocumentType>("custom");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title || `${DOCUMENT_TYPE_LABELS[type]} — новый`,
          content: "<p></p>",
        }),
      });
      if (res.ok) {
        const doc = await res.json();
        onCreated(doc.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Новый документ</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Тип документа
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DocumentType)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {(
                Object.entries(DOCUMENT_TYPE_LABELS) as [DocumentType, string][]
              ).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Название
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${DOCUMENT_TYPE_LABELS[type]} — новый`}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors cursor-pointer"
            >
              {loading ? "Создание..." : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditPatientModal({
  patient,
  onClose,
  onSaved,
}: {
  patient: Patient;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: patient.fullName,
    birthDate: patient.birthDate.split("T")[0],
    gender: patient.gender as "male" | "female",
    address: patient.address || "",
    phone: patient.phone || "",
    insuranceNumber: patient.insuranceNumber || "",
    diagnosis: patient.diagnosis || "",
  });

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) onSaved();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            Редактирование пациента
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ФИО *
            </label>
            <input
              type="text"
              required
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Дата рождения *
              </label>
              <input
                type="date"
                required
                value={form.birthDate}
                onChange={(e) => set("birthDate", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Пол *
              </label>
              <select
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Телефон
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Адрес
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Диагноз
            </label>
            <input
              type="text"
              value={form.diagnosis}
              onChange={(e) => set("diagnosis", e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors cursor-pointer"
            >
              {loading ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
