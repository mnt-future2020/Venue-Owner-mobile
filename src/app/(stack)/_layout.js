import { Stack } from 'expo-router';

export default function StackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen 
        name="edit-profile" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="product-detail" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="checkout" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="orders" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="wishlist" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="addresses" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="categories" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="order-success" 
        options={{ 
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
    </Stack>
  );
}