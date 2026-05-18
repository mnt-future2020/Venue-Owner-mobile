import { useState, useEffect } from "react";
import CustomToast from "./CustomToast";

let toastManagerRef = null;

export default function ToastManager() {
  const [toastConfig, setToastConfig] = useState({
    id: 0,
    visible: false,
    type: "info",
    message: "",
    description: "",
  });

  useEffect(() => {
    toastManagerRef = {
      show: (config) => {
        setToastConfig({
          id: Date.now(),
          visible: true,
          type: config.type || "info",
          message: config.message || "",
          description: config.description || "",
        });
      },
      hide: () => {
        setToastConfig((prev) => ({ ...prev, visible: false }));
      },
    };
    return () => {
      toastManagerRef = null;
    };
  }, []);

  const handleHide = () => {
    setToastConfig((prev) => ({ ...prev, visible: false }));
  };

  return (
    <CustomToast
      key={toastConfig.id}
      visible={toastConfig.visible}
      type={toastConfig.type}
      message={toastConfig.message}
      description={toastConfig.description}
      onHide={handleHide}
    />
  );
}

export const showToast = (config) => {
  if (toastManagerRef) toastManagerRef.show(config);
};

export const hideToast = () => {
  if (toastManagerRef) toastManagerRef.hide();
};
