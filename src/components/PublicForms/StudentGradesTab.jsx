import React from "react";
import { Typography, Table, Button, Tag } from "antd";
import { DownloadOutlined, LockOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

const gradeColumns = [
    {
        title: "Materia",
        dataIndex: "materia",
        key: "materia",
        width: "70%",
    },
    {
        title: "Calificación",
        dataIndex: "nota",
        key: "nota",
        width: "30%",
        align: "center",
        render: (nota) => {
            if (nota === null || nota === undefined || String(nota).trim() === "") {
                return <span style={{ color: "#9ca3af" }}>N/A</span>;
            }
            const n = parseFloat(nota);
            if (isNaN(n)) return <span style={{ color: "#9ca3af" }}>N/A</span>;
            const color = n >= 3.0 ? "#16a34a" : "#dc2626";
            return <span style={{ fontWeight: 700, color }}>{n.toFixed(1)}</span>;
        },
    },
];

function StudentGradesTab({
    gradesInfo = [],
    gradesByCierre,
    currentStudentId,
    studentInfo,
    loading,
    onDownloadReport,
}) {
    const hasCierres = gradesByCierre && gradesByCierre.length > 0;

    return (
        <>
            <Title level={4} style={{ color: "#003366", marginBottom: 16 }}>
                Mis notas
            </Title>

            {hasCierres ? (
                gradesByCierre.map((cierre) => (
                    <div key={cierre.cierre_id} style={{ marginBottom: 28 }}>
                        {/* Encabezado del cierre */}
                        <div
                            style={{
                                background: "#eef2ff",
                                border: "1px solid #c7d2fe",
                                borderRadius: "8px 8px 0 0",
                                padding: "10px 16px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <LockOutlined style={{ color: "#4f46e5", fontSize: 14 }} />
                                <span style={{ fontWeight: 700, color: "#3730a3", fontSize: 14 }}>
                                    {cierre.nombre}
                                </span>
                                <Tag color="green" style={{ marginLeft: 4, fontSize: 11 }}>
                                    Cerrado
                                </Tag>
                            </div>
                            {cierre.fecha_cierre && (
                                <span style={{ fontSize: 12, color: "#6b7280" }}>
                                    {new Date(cierre.fecha_cierre).toLocaleDateString("es-CO", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </span>
                            )}
                        </div>

                        <Table
                            columns={gradeColumns}
                            dataSource={cierre.grades.map((g, i) => ({
                                ...g,
                                key: `${cierre.cierre_id}-${g.materia}-${i}`,
                            }))}
                            pagination={false}
                            bordered
                            size="middle"
                            style={{ borderRadius: "0 0 8px 8px", overflow: "hidden" }}
                            locale={{ emptyText: "Sin calificaciones en este cierre." }}
                        />
                    </div>
                ))
            ) : (
                /* Fallback: vista plana (datos sin cierres o vacío) */
                <>
                    <Table
                        columns={gradeColumns}
                        dataSource={gradesInfo.map((grade, index) => ({
                            ...grade,
                            key: `${grade.materia}-${index}-${currentStudentId}`,
                        }))}
                        pagination={false}
                        bordered
                        size="middle"
                        locale={{ emptyText: "No hay calificaciones registradas." }}
                        style={{ borderRadius: 6, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
                    />
                    {gradesInfo.length === 0 && studentInfo && (
                        <Text type="warning" style={{ display: "block", textAlign: "center", marginTop: 10 }}>
                            El estudiante no tiene calificaciones registradas.
                        </Text>
                    )}
                </>
            )}

            <Button
                type="default"
                icon={<DownloadOutlined />}
                onClick={onDownloadReport}
                loading={loading}
                block
                size="large"
                style={{
                    marginTop: 24,
                    borderRadius: 6,
                    background: "#28a745",
                    color: "white",
                    borderColor: "#28a745",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
                disabled={!studentInfo || !currentStudentId}
            >
                {loading ? "Procesando..." : "Descargar reporte en PDF"}
            </Button>
        </>
    );
}

export default StudentGradesTab;
