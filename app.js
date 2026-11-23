(() => {
'use strict';
const wiki = window.AGENT_WIKI;
if (!wiki || !Array.isArray(wiki.sources)) { console.error('Wiki 資料未載入：請確認 wiki-data.js 存在'); return; }
const $ = id => document.getElementById(id);
const byId = id => wiki.sources.find(d => d.id === id);
const norm = s => String(s ?? '').toLocaleLowerCase('zh-Hant').replace(/\s+/g, ' ').trim();
const safeLink = (url, label, cls) => { const a=document.createElement('a');a.href=url;a.textContent=label;if(cls)a.className=cls;if(url.startsWith('https://')){a.target='_blank';a.rel='noopener noreferrer';}return a; };
const el = (tag, text, cls) => { const x=document.createElement(tag);if(text !== undefined)x.textContent=text;if(cls)x.className=cls;return x;};
const sourceOf = c => byId(c.source_id);
function searchChunks(query, limit=20) {
 const q=norm(query); const all=wiki.chunks;
 if (!q) return all.slice(0,limit);
 const terms=q.split(/[,，、\s]+/).filter(Boolean);
 return all.map(c => {
  const s=sourceOf(c);const text=norm(c.text), title=norm(s.title), heading=norm(c.heading), tags=norm(c.keywords.join(' '));
  let score=0;
  for(const t of terms){ if(title.includes(t))score+=5;if(heading.includes(t))score+=3;if(tags.includes(t))score+=4;if(text.includes(t))score+=2; }
  return { c, score };
 }).filter(o=>o.score>0).sort((a,b)=>b.score-a.score||a.c.id.localeCompare(b.c.id)).slice(0,limit).map(o=>o.c);
}
function makeResultRow(chunk){const s=sourceOf(chunk);const row=safeLink(`wiki.html#${s.id}`,'','result-row');const meta=el('div',undefined,'result-meta');meta.append(el('span',`${s.id} · ${s.publisher}`),el('span',chunk.heading+' ↗'));row.append(meta,el('b',s.title));row.append(el('p',chunk.text));return row;}
function initQuickSearch() {
 const input=$('quick-search'), results=$('quick-results');if(!input||!results)return;
 function render(){const records=searchChunks(input.value,3);results.replaceChildren();for(const c of records) results.append(makeResultRow(c));if(!records.length)results.append(el('div','沒有找到相符的片段，換個關鍵字試試！','empty-result'));
  $('wiki-result-count').textContent=input.value?`找到 ${searchChunks(input.value,100).length} 個片段`:`${wiki.chunk_count} 個片段可檢索`;
 }
 input.addEventListener('input',render);document.querySelectorAll('[data-query]').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.query;render();input.focus();}));render();
}
function initCards(){document.querySelectorAll('.component-card').forEach(card=>card.addEventListener('click',()=>{const isOpen=card.getAttribute('aria-expanded')==='true';card.setAttribute('aria-expanded',String(!isOpen));card.querySelector('.component-detail').hidden=isOpen;card.querySelector('.component-more span').textContent=isOpen?'＋':'−';}));}
const scenarios={
 report:[
  ['RECEIVE','🎯','接收使用者目標','使用者希望把課堂的 AI Agent 資料整理成教學內容。','已確認任務目標：完成一份易懂的教學。'],
  ['RETRIEVE','🔎','查詢 Wiki 來源','從 S01、S02 與 S03 讀取 Agent 定義、Workflow 和 Loop 的相關片段。','命中三份來源，準備生成教學大綱。'],
  ['ORGANIZE','🧩','整理成初學者教材','依「先定義 → 看差異 → 認識工具 → 理解檢查」安排章節。','已加入例子及可點回原始文件的引用。'],
  ['CHECK','✅','品質檢查通過','確認沒有把規則式推薦誤寫成真正的 AI Agent。','檢查：來源完整、基本概念正確、內容適合初學者。'],
  ['DELIVER','🌐','輸出教學 HTML','組成互動教材，測試搜尋、按鈕與手機版面。','狀態：示範完成。實際網頁的檢查結果見 TEST_REPORT.md。']
 ],
 dinner:[
  ['INPUT','🍜','取得晚餐條件','使用者選擇預算、飢餓程度、天氣、用餐時間。','固定輸入欄位，並未自主選工具。'],
  ['RULE','🧮','套用預設推薦規則','程式以既定加權方式比較菜色。','決策路徑事先寫好，屬於規則式 Workflow。'],
  ['FILTER','🪙','檢查是否符合限制','若價格超出預算，排除不符合條件的選項。','遇到不符條件，就按既定程式重算。'],
  ['OUTPUT','🍱','回傳推薦結果','回傳餐點名稱、參考價格與推薦理由。','有推薦結果並不代表具備 AI Agent 自主決策。'],
  ['LEARN','💡','辨別 Workflow 與 Agent','有 loop 或按鈕，也不必然就是 Agent；核心在於流程控制方式。','參考 Wiki：S02 Anthropic。']
 ],
 missing:[
  ['RECEIVE','🎯','收到一項新教學任務','希望說明「所有聊天機器人都是 Agent」是否正確。','開始查核這項說法。'],
  ['RETRIEVE','📚','從 Wiki 查詢定義','查到 S01、S02 都指出：單次問答不一定具備自主流程控制。','找到與原句相反的來源證據。'],
  ['FAIL','⚠️','品質檢查未通過','原草稿寫「所有聊天機器人都是 Agent」，與來源不符。','錯誤類型：概念混淆；不應直接輸出。'],
  ['RETRY','🔁','回到資料整理步驟','改寫成「部分聊天機器人可具有 Agent 能力，但兩者不能直接畫等號」。','這就是 Loop：針對明確錯誤修正，不是隨機重寫。'],
  ['PASS','✅','重新檢查後通過','補上 S01、S02 引用，讀者可以點回原始文件查核。','案例完成；若兩次修正仍失敗，改成人工檢查。']
 ]};
let scenario='report', step=0;
function renderSimulator(){const s=scenarios[scenario],line=s[step];$('step-counter').textContent=`${String(step+1).padStart(2,'0')} / ${String(s.length).padStart(2,'0')}`;$('sim-step-label').textContent=`STEP ${String(step+1).padStart(2,'0')} · ${line[0]}`;$('sim-icon').textContent=line[1];$('sim-title').textContent=line[2];$('sim-description').textContent=line[3];$('sim-trace').textContent='目前狀態：'+line[4];$('sim-progress').replaceChildren(...s.map((_,i)=>{const n=el('i');if(i<=step)n.className='on';return n;}));$('sim-next').textContent=step===s.length-1?'已完成 ✓':'下一步 →';$('sim-next').disabled=step===s.length-1;}
function initSimulator(){if(!$('sim-next'))return;document.querySelectorAll('.scenario').forEach(btn=>btn.addEventListener('click',()=>{scenario=btn.dataset.scenario;step=0;document.querySelectorAll('.scenario').forEach(x=>{x.classList.toggle('active',x===btn);x.setAttribute('aria-pressed',String(x===btn));});renderSimulator();}));$('sim-next').addEventListener('click',()=>{if(step<scenarios[scenario].length-1){step++;renderSimulator();}});$('sim-reset').addEventListener('click',()=>{step=0;renderSimulator();});renderSimulator();}
const questions=[
 {q:'哪個描述最符合 AI Agent？',o:['只要會聊天的 AI 就算 Agent','能在目標與授權範圍內，動態決定步驟並使用工具','只要網頁有漂亮動畫就是 Agent'],a:1,reason:'Agent 的關鍵是管理任務流程、依結果做判斷及使用工具，而不是單純會對話。',source:'S01'},
 {q:'我們之前做的「我要吃飯飯巴布」使用固定評分規則，主要屬於哪一種？',o:['規則式 Workflow','一定是自主 AI Agent','大型語言模型本身'],a:0,reason:'預設規則的執行路徑是固定的，沒有讓 LLM 動態決定使用工具或重規劃步驟。',source:'S02'},
 {q:'產出教學 HTML 前發現某段內容沒有可靠來源，最合適的做法？',o:['繼續輸出，反正有人看懂就好','把來源名稱隨意補上','返回 Wiki 查詢或修正；仍無資料就標明待查證'],a:2,reason:'檢查失敗時應回圈到適當步驟，不應編造來源。',source:'S03'}
];let qidx=0,answers=[],picked=null;
function renderQuiz(){const total=questions.length;const q=questions[qidx];$('quiz-count').textContent=`${qidx+1} / ${total}`;$('quiz-bar').style.width=`${Math.round((qidx+1)/total*100)}%`;$('quiz-question').textContent=q.q;$('quiz-options').replaceChildren();$('quiz-feedback').replaceChildren();$('quiz-next').disabled=true;$('quiz-next').hidden=false;$('quiz-next').textContent=qidx===total-1?'查看成績 →':'下一題 →';$('quiz-retry').hidden=true;picked=null;
 q.o.forEach((label,i)=>{const btn=el('button',undefined,'quiz-option');btn.type='button';btn.append(el('span',String.fromCharCode(65+i)),el('b',label));btn.addEventListener('click',()=>{picked=i;Array.from($('quiz-options').children).forEach((b,j)=>{b.className='quiz-option'+(j===i?' selected':'');});$('quiz-next').disabled=false;const fb=$('quiz-feedback');fb.replaceChildren(el('span',i===q.a?'✅ 答對了！ ':'📌 再看一次： '));fb.append(el('span',q.reason+' '),safeLink(`wiki.html#${q.source}`,`查看 ${q.source} 來源 ↗`));});$('quiz-options').append(btn);});}
function finishQuiz(){const score=answers.filter((a,i)=>a===questions[i].a).length;$('quiz-count').textContent='COMPLETED';$('quiz-bar').style.width='100%';$('quiz-question').textContent=`完成！你答對 ${score} / ${questions.length} 題`;$('quiz-options').replaceChildren(el('div',score===3?'🎉 三題全對，對 Agent 的基本觀念很清楚！':'💡 可以點回 Wiki 複習容易搞混的地方。','empty-result'));$('quiz-feedback').replaceChildren(el('span','這份測驗在瀏覽器本機執行，不收集或上傳個人資料。'));$('quiz-next').hidden=true;$('quiz-retry').hidden=false;}
function initQuiz(){if(!$('quiz-options'))return;$('quiz-next').addEventListener('click',()=>{if(picked===null)return;answers[qidx]=picked;if(qidx===questions.length-1)finishQuiz();else{qidx++;renderQuiz();}});$('quiz-retry').addEventListener('click',()=>{qidx=0;answers=[];renderQuiz();});renderQuiz();}
function renderWiki(source){const d=$('wiki-detail');d.replaceChildren();const top=el('div',undefined,'wiki-detail-top');top.append(el('span',`${source.id} / INDEXED SOURCE`,'wiki-document-id'),el('span',source.category,'wiki-pill'));d.append(top,el('h2',source.title),el('p',source.summary,'wiki-intro'));
 const meta=el('div',undefined,'wiki-meta-list');for(const [key,val] of [['PUBLISHER',source.publisher],['ORIGINAL DOCUMENT',source.source_title],['SOURCE DATE',source.source_date],['REVIEWED',source.accessed]]){const box=el('div');box.append(el('b',key),el('span',val));meta.append(box);}d.append(meta);
 const parts=[['重要概念',source.points,'points'],['實際例子',source.example,'example'],['常見誤解',source.caution,'caution']];for(const [title,body,style] of parts){const sec=el('section',undefined,'wiki-entry-section'+(style!=='points'?' wiki-highlight':'')+(style==='caution'?' wiki-warning':''));sec.append(el('h3',title));if(Array.isArray(body)){const ul=el('ul');body.forEach(s=>ul.append(el('li',s)));sec.append(ul);}else sec.append(el('p',body));d.append(sec);}
 const chunks=wiki.chunks.filter(x=>x.source_id===source.id);const part=el('section',undefined,'wiki-chunk-list');part.append(el('h3',`Ingest 結果：${chunks.length} 個知識片段`));const tags=el('div');chunks.forEach(c=>tags.append(el('span',`${c.id} · ${c.heading}`,'wiki-chunk')));part.append(tags);d.append(part);const keywords=el('div',undefined,'wiki-keywords');source.keywords.forEach(k=>keywords.append(el('span',k)));d.append(keywords);const link=el('p');link.style.marginTop='28px';link.append(safeLink(source.url,'閱讀官方原始資料 ↗','btn btn-ghost'));d.append(link);
}
function initWikiPage(){const nav=$('wiki-source-nav');if(!nav)return;const input=$('wiki-filter');let activeId=wiki.sources.some(x=>x.id===window.location.hash.slice(1))?window.location.hash.slice(1):wiki.sources[0].id;
 function renderNav(){const q=norm(input.value);nav.replaceChildren();const filtered=wiki.sources.filter(s=>!q||norm([s.title,s.publisher,s.category,...s.keywords].join(' ')).includes(q));if(!filtered.length)nav.append(el('p','找不到符合的來源。','wiki-empty'));filtered.forEach(s=>{const button=el('button',undefined,'wiki-source-link'+(s.id===activeId?' active':''));button.append(el('span',s.id),el('b',s.title));button.type='button';button.addEventListener('click',()=>{activeId=s.id;history.replaceState(null,'',`#${s.id}`);renderNav();renderWiki(s);});nav.append(button);});}
 function selectHash(){const id=location.hash.substring(1);if(byId(id))activeId=id;renderNav();renderWiki(byId(activeId));}
 input.addEventListener('input',renderNav);window.addEventListener('hashchange',selectHash);$('wiki-source-stat').textContent=wiki.source_count;$('wiki-chunk-stat').textContent=wiki.chunk_count;selectHash();
}
 document.querySelectorAll('[data-stat="sources"]').forEach(e=>e.textContent=String(wiki.source_count).padStart(2,'0'));
 document.querySelectorAll('[data-stat="chunks"]').forEach(e=>e.textContent=String(wiki.chunk_count).padStart(2,'0'));
 initCards();initSimulator();initQuickSearch();initQuiz();initWikiPage();
 window.AgentAtlasTest = {search:searchChunks,sourceCount:wiki.source_count,chunkCount:wiki.chunk_count};
})();
