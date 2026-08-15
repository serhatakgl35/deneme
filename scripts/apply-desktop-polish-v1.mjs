import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const layoutPath = path.join(root, 'src/components/Layout.module.css');
const dashboardPath = path.join(root, 'src/pages/DashboardPage.module.css');

let layoutCss = fs.readFileSync(layoutPath, 'utf8');
let dashboardCss = fs.readFileSync(dashboardPath, 'utf8');

const layoutPatch = `
/* desktop polish v1 */
@media(min-width:821px){
  .topbarInner{max-width:1500px;min-height:90px;padding:14px 28px;gap:22px}
  .brandBlock{gap:14px}
  .brandMark{width:46px;height:50px;font-size:11px}
  .titleBlock .eyebrow{font-size:8.5px;letter-spacing:1.25px;margin-bottom:4px}
  .titleBlock h1{font-size:25px;line-height:1.08;letter-spacing:-.72px}
  .titleBlock p{margin-top:5px;font-size:10px}
  .topbarRight{gap:8px}
  .liveClock{min-width:150px;border-radius:13px;padding:7px 10px}
  .liveClock span{font-size:8px}
  .liveClock strong{font-size:15px}
  .userPill{max-width:190px;border-radius:13px;padding:7px 10px;gap:8px}
  .userPill strong{font-size:10.5px}
  .userPill small{font-size:8.5px}
  .logoutButton{height:38px;padding:0 14px;border-radius:12px;font-size:10px}
  .moduleNavInner{max-width:1500px;min-height:52px;padding:7px 28px;gap:9px}
  .homeBack{font-size:10px;padding:7px 9px}
  .moduleName{font-size:10px}
  .moduleLink{font-size:9.5px;padding:7px 10px;border-radius:10px}
  .content{max-width:1500px;padding:18px 28px 40px}
}
@media(min-width:821px) and (max-width:1180px){
  .topbarInner{padding-left:20px;padding-right:20px}
  .content{padding-left:20px;padding-right:20px}
  .moduleNavInner{padding-left:20px;padding-right:20px}
}
`;

const dashboardPatch = `
/* desktop dashboard polish v1 */
@media(min-width:821px){
  .stack{max-width:1440px;gap:14px}
  .priorityStrip{padding:10px 13px;border-radius:14px;gap:11px}
  .priorityDot{width:8px;height:8px;box-shadow:0 0 0 4px rgba(215,147,36,.10)}
  .priorityStrip strong{font-size:11px}
  .priorityStrip small{font-size:9px}
  .priorityAction{font-size:9px}
  .overview,.hub{border-radius:20px;box-shadow:0 9px 26px rgba(30,49,50,.04)}
  .overview{padding:18px 19px}
  .overviewHead,.hubHead{gap:14px}
  .eyebrow{font-size:7.5px;letter-spacing:1.15px;margin-bottom:4px}
  .overview h2,.hub h2{font-size:21px;letter-spacing:-.55px}
  .datePill{padding:7px 10px;font-size:8.5px}
  .summaryGrid{gap:8px;margin-top:14px}
  .summaryCard{min-height:96px;border-radius:15px;padding:12px 13px}
  .summaryCard>span{font-size:7.8px;letter-spacing:.38px}
  .summaryCard strong{margin-top:6px;font-size:17px}
  .summaryCard small{padding-top:7px;font-size:8px;line-height:1.3}
  .cardAction{padding-top:6px;font-size:7.8px}
  .managerSummaryGrid{grid-template-columns:1.15fr .64fr 1.18fr .88fr}
  .personnelSummaryCard,.mealSummaryCard,.activitySummaryCard{min-height:112px}
  .statusMiniGrid{gap:4px;margin:8px 0 2px}
  .miniStat{gap:1px;padding:6px 5px;border-radius:9px}
  .miniStat b{font-size:13px}
  .miniStat small{font-size:6.7px}
  .mealOverviewGrid{gap:6px;margin-top:7px}
  .mealOverviewGrid>div{border-radius:9px;padding:7px}
  .mealOverviewGrid b{font-size:7px}
  .mealOverviewGrid strong{margin-top:3px;font-size:8.2px}
  .mealOverviewGrid em{margin-top:5px;font-size:7px;padding:3px 6px}
  .todayActivityList{gap:4px;margin-top:7px}
  .todayActivityList>span{grid-template-columns:36px minmax(0,1fr);gap:5px;padding:5px 6px;border-radius:8px}
  .todayActivityList b{font-size:7px}
  .todayActivityList em{font-size:7.8px}
  .hub{padding:18px 19px}
  .hubHead{padding:0 1px 13px}
  .hubHead p{margin-top:5px;font-size:9.3px;line-height:1.4}
  .groupGrid{border-radius:16px}
  .group{padding:15px 15px 11px}
  .groupTitle{gap:9px;padding-bottom:10px}
  .groupIcon{width:34px;height:34px;border-radius:10px}
  .groupTitle h3{font-size:13px}
  .groupTitle p{margin-top:2px;font-size:7.8px}
  .hubLink{grid-template-columns:30px minmax(0,1fr) auto 18px;gap:8px;min-height:45px;padding:5px 3px}
  .hubLink:hover{padding-left:6px;padding-right:6px}
  .linkIcon{width:29px;height:29px;border-radius:9px}
  .linkCopy strong{font-size:9.5px}
  .linkCopy small{font-size:7.6px}
  .meta{padding:4px 6px;font-size:7px}
  .linkArrow{font-size:13px}
}
@media(min-width:1280px){
  .groupGrid{grid-template-columns:repeat(4,minmax(0,1fr))}
  .group{border-bottom:0!important;border-right:1px solid #e2e8e6!important}
  .group:last-child{border-right:0!important}
}
@media(min-width:821px) and (max-width:1279px){
  .groupGrid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .group{border-right:0;border-bottom:0}
  .group:nth-child(odd){border-right:1px solid #e2e8e6}
  .group:nth-child(-n+2){border-bottom:1px solid #e2e8e6}
}
@media(min-width:821px) and (max-width:1120px){
  .managerSummaryGrid,.summaryGrid:not(.managerSummaryGrid){grid-template-columns:repeat(2,minmax(0,1fr))}
  .managerSummaryGrid .mealSummaryCard{grid-column:auto}
  .personnelSummaryCard,.mealSummaryCard,.activitySummaryCard{min-height:100px}
}
`;

if (!layoutCss.includes('/* desktop polish v1 */')) layoutCss += layoutPatch;
if (!dashboardCss.includes('/* desktop dashboard polish v1 */')) dashboardCss += dashboardPatch;

fs.writeFileSync(layoutPath, layoutCss);
fs.writeFileSync(dashboardPath, dashboardCss);
console.log('PBYS masaüstü görünümü kompakt ve dengeli hale getirildi.');
