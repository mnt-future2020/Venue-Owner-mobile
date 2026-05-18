import React, { memo, useCallback, useRef } from "react";
import { Pressable } from "react-native";

function FastPressable(
  {
    onPress,
    onPressIn,
    warmup,
    children,
    disabled = false,
    android_ripple,
    ...rest
  },
  ref
) {
  const warmedRef = useRef(false);

  const handlePressIn = useCallback(
    (event) => {
      if (!warmedRef.current && typeof warmup === "function") {
        warmedRef.current = true;
        Promise.resolve()
          .then(() => warmup())
          .catch(() => {});
      }
      onPressIn?.(event);
    },
    [onPressIn, warmup]
  );

  const handlePress = useCallback(
    (event) => {
      if (disabled) return;
      onPress?.(event);
    },
    [disabled, onPress]
  );

  return (
    <Pressable
      ref={ref}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={handlePressIn}
      android_ripple={android_ripple}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

export default memo(React.forwardRef(FastPressable));
