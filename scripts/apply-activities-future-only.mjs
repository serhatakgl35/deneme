import fs from 'node:fs';
import path from 'node:path';

const target = path.join(process.cwd(), 'src/pages/ActivitiesPage.tsx');
let source = fs.readFileSync(target, 'utf8');

function replaceExact(from, to) {
  if (!source.includes(from)) throw new Error(`ActivitiesPage dönüşümü uygulanamadı: ${from.slice(0, 80)}`);
  source = source.replace(from, to);
}

replaceExact(
  "  const [anchorDate, setAnchorDate] = useState(todayIso());",
  "  const today = todayIso();\n  const [anchorDate, setAnchorDate] = useState(today);"
);

replaceExact(
  "  const weekEnd = weekDays[6];",
  "  const weekEnd = weekDays[6];\n  const currentWeekStart = useMemo(() => mondayOf(today), [today]);\n  const visibleWeekDays = useMemo(() => weekDays.filter(day => day >= today), [weekDays, today]);\n  const queryStart = weekStart < today ? today : weekStart;"
);

replaceExact("        .gte('activity_date', weekStart)", "        .gte('activity_date', queryStart)");
replaceExact("  }, [weekStart, weekEnd]);", "  }, [queryStart, weekEnd]);");
replaceExact("    weekDays.forEach(day => map.set(day, []));", "    visibleWeekDays.forEach(day => map.set(day, []));");
replaceExact("  }, [activities, weekDays]);", "  }, [activities, visibleWeekDays]);");

replaceExact(
  "  function openNew(date = todayIso()) {\n    setForm({ ...emptyForm, activityDate: date });",
  "  function openNew(date = today) {\n    const safeDate = date < today ? today : date;\n    setForm({ ...emptyForm, activityDate: safeDate });"
);

replaceExact(
  "    if (form.startTime && form.endTime && form.endTime < form.startTime) {",
  "    if (form.activityDate < today) {\n      setError('Geçmiş tarihe faaliyet eklenemez veya taşınamaz.');\n      return;\n    }\n    if (form.startTime && form.endTime && form.endTime < form.startTime) {"
);

replaceExact(
  '<label className={styles.field}>Hafta içinde tarih<input type="date" value={anchorDate}',
  '<label className={styles.field}>Hafta içinde tarih<input type="date" min={today} value={anchorDate}'
);
replaceExact(
  '      <button onClick={() => moveWeek(-1)}>← Önceki</button>',
  '      <button disabled={weekStart <= currentWeekStart} onClick={() => moveWeek(-1)}>← Önceki</button>'
);
replaceExact(
  '      <button onClick={() => setAnchorDate(todayIso())}>Bu Hafta</button>',
  '      <button onClick={() => setAnchorDate(today)}>Bu Hafta</button>'
);
replaceExact('      {weekDays.map(day => {', '      {visibleWeekDays.length ? visibleWeekDays.map(day => {');
replaceExact('        const isToday = day === todayIso();', '        const isToday = day === today;');
replaceExact(
  '        </section>;\n      })}\n    </div>',
  '        </section>;\n      }) : <div className={styles.empty}>Geçmiş faaliyetler gösterilmez.</div>}\n    </div>'
);
replaceExact(
  '<label>Tarih<input type="date" value={form.activityDate}',
  '<label>Tarih<input type="date" min={today} value={form.activityDate}'
);

fs.writeFileSync(target, source);
console.log('Haftalık faaliyetler bugünden itibaren gösterilecek şekilde güncellendi.');
