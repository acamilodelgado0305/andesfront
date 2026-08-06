import React, { useState } from "react";
import { Table, Button, Tag, Tooltip } from "antd";
import { DownloadOutlined, LockOutlined } from "@ant-design/icons";

const NOTA_APROBACION = 3.0;

const promedioDe = (items = []) => {
    const nums = items.map((g) => Number(g.nota)).filter((n) => !Number.isNaN(n));
    if (!nums.length) return null;
    return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2));
};

const notaTag = (nota) => {
    if (nota === null || nota === undefined || String(nota).trim() === "") {
        return <Tag>N/A</Tag>;
    }
    const n = parseFloat(nota);
    if (isNaN(n)) return <Tag>N/A</Tag>;
    return (
        <Tag color={n >= NOTA_APROBACION ? "green" : "orange"} style={{ fontWeight: 700, fontSize: 11, lineHeight: "14px", padding: "0 6px", margin: 0 }}>
            {n.toFixed(1)}
        </Tag>
    );
};

const gradeColumns = [
    { title: "Materia", dataIndex: "materia", key: "materia" },
    { title: "Nota", dataIndex: "nota", key: "nota", width: 90, align: "center", render: notaTag },
];

// Detalle de la materia: una línea por tema con la nota de sus evaluaciones.
// La nota de la materia es el promedio de estas evaluaciones dentro del periodo.
const TemasDetalle = ({ temas = [] }) => (
    <div className="py-1.5 pl-2 pr-1">
        <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-[#a8a59e] mb-1.5">
            Detalle por tema
        </div>
        <div className="flex flex-col gap-0.5">
            {temas.map((t, i) => (
                <div
                    key={`${t.tema}-${i}`}
                    className="flex items-center justify-between gap-3 py-1 border-b border-dashed border-gray-200 dark:border-[#403e3a] last:border-b-0"
                >
                    <span className="text-xs text-gray-600 dark:text-[#faf9f5] truncate">
                        {t.tema}
                        {t.total_evaluaciones > 1 && (
                            <span className="text-[10px] text-gray-400 dark:text-[#a8a59e] ml-1.5">
                                ({t.total_evaluaciones} evaluaciones)
                            </span>
                        )}
                    </span>
                    <span className="flex-shrink-0">{notaTag(t.nota)}</span>
                </div>
            ))}
        </div>
    </div>
);

// Boletín del estudiante. Se enfoca en el PERIODO ACTUAL (el abierto de menor
// orden, que marca el backend con `es_actual`); los periodos ya cerrados y el
// histórico quedan detrás de "Ver periodos anteriores".
function StudentGradesTab({
    gradesInfo = [],
    gradesByCierre,
    currentStudentId,
    studentInfo,
    loading,
    onDownloadReport,
}) {
    const [showAnteriores, setShowAnteriores] = useState(false);
    const periodos = gradesByCierre || [];
    const hasPeriodos = periodos.length > 0;

    // Periodo actual: el que marca el backend. Si todos están cerrados, se toma
    // el último no histórico como el más avanzado.
    const noHistoricos = periodos.filter((p) => !p.es_historico);
    const periodoActual =
        periodos.find((p) => p.es_actual) ||
        noHistoricos[noHistoricos.length - 1] ||
        periodos[periodos.length - 1] ||
        null;

    const periodosAnteriores = periodos.filter((p) => p !== periodoActual);

    const gradesActuales = periodoActual ? periodoActual.grades : gradesInfo;
    const promedioPeriodo = promedioDe(gradesActuales);

    // Nota final acumulada: promedio simple de los periodos NO históricos que ya
    // tienen notas (Periodo 1, 2 y 3 pesan igual).
    const promediosPeriodos = noHistoricos
        .map((p) => promedioDe(p.grades))
        .filter((n) => n !== null);
    const promedioFinal = promediosPeriodos.length
        ? Number((promediosPeriodos.reduce((a, b) => a + b, 0) / promediosPeriodos.length).toFixed(2))
        : null;

    const nombre =
        studentInfo?.nombre_completo ||
        `${studentInfo?.nombre || ""} ${studentInfo?.apellido || ""}`.trim() ||
        "Estudiante";
    const documento = studentInfo?.documento || studentInfo?.numero_documento || "—";

    const tableProps = {
        columns: gradeColumns,
        pagination: false,
        bordered: true,
        size: "small",
        // Cada materia se despliega para ver la nota de cada tema.
        expandable: {
            expandedRowRender: (record) => <TemasDetalle temas={record.temas} />,
            rowExpandable: (record) => (record.temas?.length || 0) > 0,
            expandRowByClick: true,
        },
    };

    const NotaGrande = ({ valor, etiqueta, tooltip }) => (
        <Tooltip title={tooltip}>
            <div className="flex flex-col items-center px-5 py-2 rounded-xl bg-gray-50 dark:bg-[#262624] border border-gray-200 dark:border-[#403e3a] flex-shrink-0">
                <span
                    className={`text-2xl font-bold ${
                        valor >= NOTA_APROBACION
                            ? "text-green-600 dark:text-green-400"
                            : "text-amber-600 dark:text-amber-400"
                    }`}
                >
                    {valor.toFixed(1)}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-[#a8a59e]">
                    {etiqueta}
                </span>
            </div>
        </Tooltip>
    );

    const renderTablaPeriodo = (periodo, { actual = false } = {}) => {
        const prom = promedioDe(periodo.grades);
        return (
            <div key={periodo.cierre_id ?? "sin-periodo"} className="mb-6 rounded-xl overflow-hidden border border-gray-200 dark:border-[#403e3a]">
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-gray-50 dark:bg-[#262624] border-b border-gray-200 dark:border-[#403e3a]">
                    <div className="flex items-center gap-2 min-w-0">
                        {periodo.cerrado && <LockOutlined className="text-gray-400 dark:text-[#a8a59e]" style={{ fontSize: 13 }} />}
                        <span className="font-semibold text-sm text-gray-700 dark:text-[#faf9f5] truncate">{periodo.nombre}</span>
                        {actual ? (
                            <Tag color="blue" style={{ marginInlineEnd: 0, fontSize: 11 }}>En curso</Tag>
                        ) : periodo.es_historico ? (
                            <Tag style={{ marginInlineEnd: 0, fontSize: 11 }}>Histórico</Tag>
                        ) : (
                            <Tag color="green" style={{ marginInlineEnd: 0, fontSize: 11 }}>Cerrado</Tag>
                        )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {prom !== null && (
                            <span className="text-xs text-gray-500 dark:text-[#a8a59e]">
                                Promedio <strong className={prom >= NOTA_APROBACION ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}>{prom.toFixed(1)}</strong>
                            </span>
                        )}
                        {periodo.fecha_cierre && (
                            <span className="text-xs text-gray-400 dark:text-[#a8a59e] hidden sm:inline">
                                {new Date(periodo.fecha_cierre).toLocaleDateString("es-CO", {
                                    year: "numeric", month: "long", day: "numeric",
                                })}
                            </span>
                        )}
                    </div>
                </div>

                <Table
                    {...tableProps}
                    className="notas-tabla-compacta"
                    dataSource={periodo.grades.map((g, i) => ({ ...g, key: `${periodo.cierre_id}-${g.materia}-${i}` }))}
                    locale={{ emptyText: "Sin calificaciones en este periodo." }}
                />
            </div>
        );
    };

    return (
        <div>
            <div className="rounded-2xl border border-gray-200 dark:border-[#403e3a] bg-white dark:bg-[#30302e] overflow-hidden mb-4">
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="min-w-0">
                        <div className="font-semibold text-lg text-gray-800 dark:text-[#faf9f5] truncate">{nombre}</div>
                        <div className="text-sm text-gray-500 dark:text-[#a8a59e]">Documento: {documento}</div>
                    </div>
                    <div className="flex items-center gap-3">
                        {promedioPeriodo !== null && (
                            <NotaGrande
                                valor={promedioPeriodo}
                                etiqueta={periodoActual?.nombre || "Promedio"}
                                tooltip="Promedio de las materias en el periodo actual"
                            />
                        )}
                        {promedioFinal !== null && promediosPeriodos.length > 1 && (
                            <NotaGrande
                                valor={promedioFinal}
                                etiqueta="Acumulado"
                                tooltip="Promedio de todos los periodos cursados (cada periodo pesa igual)"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Periodo actual; los demás quedan colapsados abajo. */}
            {hasPeriodos ? (
                <>
                    {periodoActual && renderTablaPeriodo(periodoActual, { actual: true })}

                    {periodosAnteriores.length > 0 && (
                        <div className="mb-4">
                            <button
                                type="button"
                                onClick={() => setShowAnteriores((v) => !v)}
                                className="text-sm font-medium text-[#155153] dark:text-[#2dd4bf] hover:underline"
                            >
                                {showAnteriores
                                    ? "Ocultar periodos anteriores"
                                    : `Ver periodos anteriores (${periodosAnteriores.length})`}
                            </button>

                            {showAnteriores && (
                                <div className="mt-3">
                                    {periodosAnteriores.slice().reverse().map((p) => renderTablaPeriodo(p))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-[#403e3a]">
                    <Table
                        {...tableProps}
                        className="notas-tabla-compacta"
                        dataSource={gradesInfo.map((grade, index) => ({ ...grade, key: `${grade.materia}-${index}-${currentStudentId}` }))}
                        locale={{ emptyText: "No hay calificaciones registradas." }}
                    />
                </div>
            )}

            <style>{`
                .notas-tabla-compacta .ant-table-thead > tr > th {
                    padding: 4px 10px !important;
                    font-size: 11px !important;
                }
                .notas-tabla-compacta .ant-table-tbody > tr > td {
                    padding: 0px 10px !important;
                    line-height: 15px !important;
                    font-size: 12px !important;
                }
                /* La fila desplegada (detalle por tema) sí necesita respirar */
                .notas-tabla-compacta .ant-table-expanded-row > td {
                    padding: 4px 10px !important;
                    line-height: normal !important;
                }
                .notas-tabla-compacta .ant-table-row-expand-icon {
                    transform: scale(0.8);
                }
            `}</style>

            <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => onDownloadReport?.(gradesActuales)}
                loading={loading}
                block
                size="large"
                className="mt-5"
                style={{ backgroundColor: "#155153", borderColor: "#155153" }}
                disabled={!studentInfo || !currentStudentId}
            >
                {loading ? "Generando..." : "Descargar boletín en PDF"}
            </Button>
        </div>
    );
}

export default StudentGradesTab;
