const fs = require('fs');

const file = 'c:/Users/edgar/development/itsmt-sice/itsmt-sice/frontend/src/features/academico/pages/PlaneacionEditorPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace space-y-1 container with flex row container
code = code.replace(
  '<div className="mt-1 space-y-1">',
  '<div className="mt-1 flex flex-wrap items-center justify-between gap-2">'
);

// Remove unnecessary wrapper <div> around MejorarConIa
code = code.replace(
  `<div>
                                               <MejorarConIa texto={richTextAPlano(a.actividad_aprendizaje)} tipo="actividad_aprendizaje"
                                                 contexto={ctxFila} resaltar={resFila}
                                                 onAplicar={(t, ev) => aplicarMejoraAprendizaje(idx, aIdx, t, ev)} />
                                             </div>`,
  `<MejorarConIa texto={richTextAPlano(a.actividad_aprendizaje)} tipo="actividad_aprendizaje"
                                                 contexto={ctxFila} resaltar={resFila}
                                                 onAplicar={(t, ev) => aplicarMejoraAprendizaje(idx, aIdx, t, ev)} />`
);

// Mobile view update
code = code.replace(
  `{!soloLectura && (
                                       <>
                                         <SelectorProductoAprendizaje`,
  `{!soloLectura && (
                                       <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                                         <SelectorProductoAprendizaje`
);

code = code.replace(
  `<div className="mt-1">
                                           <MejorarConIa texto={richTextAPlano(a.actividad_aprendizaje)} tipo="actividad_aprendizaje"
                                             contexto={ctxFila} resaltar={resFila}
                                             onAplicar={(t, ev) => aplicarMejoraAprendizaje(idx, aIdx, t, ev)} />
                                         </div>
                                       </>`,
  `<MejorarConIa texto={richTextAPlano(a.actividad_aprendizaje)} tipo="actividad_aprendizaje"
                                           contexto={ctxFila} resaltar={resFila}
                                           onAplicar={(t, ev) => aplicarMejoraAprendizaje(idx, aIdx, t, ev)} />
                                       </div>`
);

fs.writeFileSync(file, code, 'utf8');
console.log('Successfully reorganized controls in PlaneacionEditorPage.tsx');
