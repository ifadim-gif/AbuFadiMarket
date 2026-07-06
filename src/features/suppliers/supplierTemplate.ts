import * as XLSX from 'xlsx'

// رؤوس الأعمدة مطابقة تمامًا لمحلّل الاستيراد (SupplierExcelImport) فلا يحدث عدم توافق.
const HEADERS = ['رقم التعريف', 'الاسم', 'الهاتف', 'أيام الزيارة', 'حظر الطلبية']

const EXAMPLE_ROWS: (string | number)[][] = [
  ['', 'مؤسسة النور للمواد الغذائية', '0599123456', 'الأحد،الأربعاء', 'لا'],
  ['', 'شركة الفجر للتجارة', '0599765432', 'الاثنين،الخميس', 'لا'],
]

const INSTRUCTIONS: string[][] = [
  ['العمود', 'الشرح'],
  ['رقم التعريف', 'اختياري — اتركه فارغًا ليُولَّد رقم تسلسلي تلقائي. لا تملأه إلا عند نقل أرقام من نظام قديم (ويجب ألا تتكرّر).'],
  ['الاسم', 'إلزامي — اسم المورد. أي صفّ بلا اسم يُتجاهَل.'],
  ['الهاتف', 'اختياري — رقم هاتف المورد.'],
  [
    'أيام الزيارة',
    'اختياري — أيام الأسبوع مفصولة بفاصلة. اكتب الأسماء (الأحد، الاثنين، الثلاثاء، الأربعاء، الخميس، الجمعة، السبت) أو أرقامًا (0=الأحد ... 6=السبت). مثال: الأحد،الأربعاء  أو  0،3',
  ],
  ['حظر الطلبية', 'اختياري — اكتب "نعم" لمنع استلام الطلبيات من هذا المورد، أو "لا" (أو اتركه فارغًا) للسماح.'],
]

export function downloadSupplierTemplate() {
  const wb = XLSX.utils.book_new()

  const dataSheet = XLSX.utils.aoa_to_sheet([HEADERS, ...EXAMPLE_ROWS])
  dataSheet['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 24 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, dataSheet, 'الموردون')

  const helpSheet = XLSX.utils.aoa_to_sheet(INSTRUCTIONS)
  helpSheet['!cols'] = [{ wch: 14 }, { wch: 80 }]
  XLSX.utils.book_append_sheet(wb, helpSheet, 'تعليمات')

  XLSX.writeFile(wb, 'قالب-الموردين.xlsx')
}
