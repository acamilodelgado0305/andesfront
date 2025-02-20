import React, { useState } from "react";
import { uploadStudents } from "../../services/studentService";

const UploadStudentsButton = () => {
    const [file, setFile] = useState(null);
    const [coordinador, setCoordinador] = useState("");
    const [message, setMessage] = useState("");

    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file || !coordinador) {
            setMessage("Por favor, selecciona un archivo y un coordinador antes de continuar.");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("file", file); // Archivo
            formData.append("coordinador", coordinador); // Coordinador

            console.log([...formData.entries()]); // Para verificar los datos en consola

            const response = await uploadStudents(formData);
            setMessage(`Estudiantes cargados exitosamente: ${response.message}`);
            setFile(null); // Limpia el archivo después de subirlo
            setCoordinador(""); // Limpia el seleccionador del coordinador
        } catch (error) {
            setMessage("Error al cargar el archivo. Por favor, inténtalo de nuevo.");
            console.error("Error al cargar estudiantes:", error);
        }
    };
    return (
        <div className="p-4 bg-gray-50 border rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Cargar Estudiantes</h2>
            <div className="mb-4">
                <label htmlFor="coordinador" className="block font-medium text-gray-700 mb-1">
                    Seleccionar Coordinador:
                </label>
                <select
                    id="coordinador"
                    value={coordinador}
                    onChange={(e) => setCoordinador(e.target.value)}
                    className="block w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Seleccione un coordinador</option>
                    <option value="Adriana Benitez">Adriana Benitez</option>
                    <option value="Camilo Delgado">Camilo Delgado</option>
                    <option value="Blanca Sanchez">Blanca Sanchez</option>
                    <option value="Mauricio Pulido">Mauricio Pulido</option>
                    <option value="Marily Gordillo">Marily Gordillo</option>
                </select>
            </div>

            <div className="mb-4">
                <label htmlFor="upload-students" className="block font-medium text-gray-700 mb-1">
                    Seleccionar Archivo:
                </label>
                <input
                    id="upload-students"
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    className="block w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleUpload}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md shadow hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    Cargar Estudiantes
                </button>
            </div>

            {message && (
                <p className={`mt-4 text-sm ${message.includes("exitosamente") ? "text-green-600" : "text-red-600"}`}>
                    {message}
                </p>
            )}
        </div>
    );
};

export default UploadStudentsButton;
