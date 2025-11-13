import React from "react";
import { Input, Button, Alert, Space, Typography, Spin } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { div } from "framer-motion/client";

const { Text } = Typography;

function StudentLoginForm({
  usernameDoc,
  passwordDoc,
  loading,
  error,
  onChangeUsername,
  onChangePassword,
  onSubmit,
}) {
  return (
    <div className="p-20">
      <Space
        direction="vertical"
        size="large"
        style={{ width: "100%", marginBottom: "20px" }}
      >
        <Text strong>
          Paso 1: Escribe tu número de documento en los dos campos.
        </Text>

        <Input
          addonBefore={<Text strong>Usuario:</Text>}
          placeholder="Número de documento"
          value={usernameDoc}
          onChange={(e) => onChangeUsername(e.target.value)}
          onPressEnter={onSubmit}
          size="large"
          disabled={loading}
          style={{ borderRadius: "6px" }}
        />

        <Input.Password
          addonBefore={<Text strong>Contraseña:</Text>}
          placeholder="Repite tu número de documento"
          value={passwordDoc}
          onChange={(e) => onChangePassword(e.target.value)}
          onPressEnter={onSubmit}
          size="large"
          disabled={loading}
          style={{ borderRadius: "6px" }}
        />

        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={onSubmit}
          loading={loading}
          block
          size="large"
          style={{
            borderRadius: "6px",
            backgroundColor: "#0056b3",
            borderColor: "#0056b3",
          }}
        >
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </Button>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            style={{ borderRadius: "6px" }}
          />
        )}

        {loading && (
          <div style={{ textAlign: "center", marginTop: "10px" }}>
            <Spin tip="Cargando datos..." />
          </div>
        )}
      </Space>

    </div>

  );
}

export default StudentLoginForm;
