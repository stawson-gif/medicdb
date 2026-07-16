import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { DocumentType } from "./types";

interface TemplateInput {
  patientName: string;
  birthDate: string;
  doctorName: string;
  specialty: string;
  department: string;
  diagnosis: string;
  date: string;
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "dd MMMM yyyy", { locale: ru });
  } catch {
    return dateStr;
  }
}

export function generateTemplate(
  type: DocumentType,
  data: TemplateInput
): { title: string; content: string } {
  const date = formatDate(data.date);
  const birth = formatDate(data.birthDate);

  switch (type) {
    case "journal":
      return {
        title: `Дневник пациента ${data.patientName} — ${date}`,
        content: `<h2>Дневник наблюдения</h2>
<p><strong>Пациент:</strong> ${data.patientName}</p>
<p><strong>Дата рождения:</strong> ${birth}</p>
<p><strong>Диагноз:</strong> ${data.diagnosis || "—"}</p>
<p><strong>Дата:</strong> ${date}</p>
<hr>
<h3>Утренний осмотр</h3>
<p><strong>Состояние:</strong></p>
<p><strong>Жалобы:</strong></p>
<p><strong>Температура тела:</strong></p>
<p><strong>АД:</strong></p>
<p><strong>ЧСС:</strong></p>
<p><strong>ЧДД:</strong></p>
<h3>Назначения</h3>
<ul><li></li></ul>
<h3>Динамика</h3>
<p></p>
<h3>Рекомендации</h3>
<p></p>
<p><strong>Лечащий врач:</strong> ${data.doctorName} (${data.specialty}, ${data.department})</p>`,
      };

    case "initial":
      return {
        title: `Первичный осмотр — ${data.patientName}`,
        content: `<h2>Первичный осмотр</h2>
<p><strong>Дата осмотра:</strong> ${date}</p>
<p><strong>ФИО пациента:</strong> ${data.patientName}</p>
<p><strong>Дата рождения:</strong> ${birth}</p>
<hr>
<h3>Жалобы</h3>
<p></p>
<h3>Anamnesis morbi (история заболевания)</h3>
<p></p>
<h3>Anamnesis vitae (история жизни)</h3>
<p></p>
<h3>Объективный статус</h3>
<p><strong>Общее состояние:</strong></p>
<p><strong>Кожные покровы:</strong></p>
<p><strong>Состояние сердечно-сосудистой системы:</strong></p>
<p><strong>Состояние дыхательной системы:</strong></p>
<p><strong>Состояние ЖКТ:</strong></p>
<p><strong>Состояние нервной системы:</strong></p>
<h3>Предварительный диагноз</h3>
<p>${data.diagnosis || ""}</p>
<h3>План обследования</h3>
<ul><li>Общий анализ крови</li><li>Общий анализ мочи</li><li>Биохимический анализ крови</li></ul>
<h3>План лечения</h3>
<p></p>
<p><strong>Врач:</strong> ${data.doctorName}, ${data.specialty}</p>
<p><strong>Подпись:</strong> _______________</p>`,
      };

    case "referral":
      return {
        title: `Направление — ${data.patientName}`,
        content: `<h2>Направление на консультацию / обследование</h2>
<p><strong>Дата:</strong> ${date}</p>
<p><strong>Отделение:</strong> ${data.department}</p>
<hr>
<p><strong>ФИО пациента:</strong> ${data.patientName}</p>
<p><strong>Дата рождения:</strong> ${birth}</p>
<p><strong>Диагноз:</strong> ${data.diagnosis || "—"}</p>
<h3>Направляется к</h3>
<p><strong>Специалисту / в отделение:</strong></p>
<h3>Цель направления</h3>
<p></p>
<h3>Клинические данные</h3>
<p></p>
<h3>Результаты обследований</h3>
<p></p>
<p><strong>Направивший врач:</strong> ${data.doctorName}, ${data.specialty}</p>
<p><strong>Подпись:</strong> _______________</p>`,
      };

    case "discharge":
      return {
        title: `Выписной эпикриз — ${data.patientName}`,
        content: `<h2>Выписной эпикриз</h2>
<p><strong>Дата выписки:</strong> ${date}</p>
<p><strong>ФИО пациента:</strong> ${data.patientName}</p>
<p><strong>Дата рождения:</strong> ${birth}</p>
<hr>
<h3>Диагноз при поступлении</h3>
<p>${data.diagnosis || ""}</p>
<h3>Диагноз при выписке</h3>
<p></p>
<h3>Жалобы при поступлении</h3>
<p></p>
<h3>Клинический диагноз</h3>
<p></p>
<h3>Данные обследований</h3>
<p></p>
<h3>Проведённое лечение</h3>
<p></p>
<h3>Рекомендации на выписку</h3>
<ul><li></li></ul>
<h3>Рекомендации по режиму</h3>
<p></p>
<h3>Рекомендации по приёму лекарств</h3>
<p></p>
<h3>Дата следующего визита</h3>
<p></p>
<p><strong>Лечащий врач:</strong> ${data.doctorName}, ${data.specialty}</p>
<p><strong>Подпись:</strong> _______________</p>
<p><strong>Заведующий отделением:</strong> _______________</p>`,
      };

    case "custom":
      return {
        title: `Документ — ${data.patientName}`,
        content: `<h2>Медицинский документ</h2>
<p><strong>Дата:</strong> ${date}</p>
<p><strong>Пациент:</strong> ${data.patientName}</p>
<p><strong>Врач:</strong> ${data.doctorName}</p>
<hr>
<p></p>`,
      };
  }
}
