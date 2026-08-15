import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = path.join(root, 'src/pages/LeavePage.tsx');
let source = fs.readFileSync(file, 'utf8');

function replaceOnce(label, from, to) {
  if (!source.includes(from)) throw new Error(`İzin görünürlük yaması uygulanamadı: ${label}`);
  source = source.replace(from, to);
}

replaceOnce('rol kapsamı',
`  const canManage = isAdmin || isAdministrative;
  const canApprove = isAdmin || isCommander;
  const canCreateSelf = !isCommander;`,
`  const canManage = isAdmin || isAdministrative;
  const canApprove = isAdmin || isCommander;
  const canViewAllLeaveRecords = canManage || canApprove;
  const canCreateSelf = !isCommander;`);

replaceOnce('personel sorgusu',
`        supabase.from('personnel').select('id, full_name, phone, rank_title, annual_allowance, road_allowance, active').eq('active', true),`,
`        canViewAllLeaveRecords
          ? supabase.from('personnel').select('id, full_name, phone, rank_title, annual_allowance, road_allowance, active').eq('active', true)
          : account.personnelId
            ? supabase.from('personnel').select('id, full_name, phone, rank_title, annual_allowance, road_allowance, active').eq('id', account.personnelId).eq('active', true)
            : Promise.resolve({ data: [], error: null }),`);

replaceOnce('izin sorgusu',
`        supabase.from('leave_requests').select('id, legacy_id, personnel_id, leave_type, start_date, end_date, day_count, city, note, status, created_at').order('created_at', { ascending: false }),`,
`        canViewAllLeaveRecords
          ? supabase.from('leave_requests').select('id, legacy_id, personnel_id, leave_type, start_date, end_date, day_count, city, note, status, created_at').order('created_at', { ascending: false })
          : account.personnelId
            ? supabase.from('leave_requests').select('id, legacy_id, personnel_id, leave_type, start_date, end_date, day_count, city, note, status, created_at').eq('personnel_id', account.personnelId).order('created_at', { ascending: false })
            : Promise.resolve({ data: [], error: null }),`);

replaceOnce('load bağımlılıkları',
`  }, [account.personnelId, isCommander]);`,
`  }, [account.personnelId, isCommander, canViewAllLeaveRecords]);`);

replaceOnce('ekran filtresi',
`    return leaves.filter(row => {
      const person = personnelById.get(row.personnel_id);`,
`    return leaves.filter(row => {
      if (!canViewAllLeaveRecords && row.personnel_id !== account.personnelId) return false;
      const person = personnelById.get(row.personnel_id);`);

replaceOnce('filtre bağımlılıkları',
`  }, [leaves, personnelById, query, statusFilter, typeFilter]);`,
`  }, [leaves, personnelById, query, statusFilter, typeFilter, canViewAllLeaveRecords, account.personnelId]);`);

fs.writeFileSync(file, source);
console.log('PBYS izin kayıtları rol bazlı görünürlükle sınırlandı.');
