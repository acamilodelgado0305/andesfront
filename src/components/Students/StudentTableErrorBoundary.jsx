import React from "react";
import { Button, Result } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

class StudentTableErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    // DOM mutation errors caused by browser translator are the main expected case
    console.warn("StudentTable error caught by boundary:", error?.message);
  }

  handleReset() {
    this.setState({ hasError: false });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="warning"
          title="Ocurrió un problema al mostrar la tabla"
          subTitle="Esto puede deberse al traductor del navegador. Desactívalo en esta página o recarga la vista."
          extra={
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => this.handleReset()}
            >
              Reintentar
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}

export default StudentTableErrorBoundary;
