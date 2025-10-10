export function successResponse(payload: any) {
  return {
    success: true,
    ...payload,
  };
}

export function errorResponse(error: string) {
  return { success: false, error };
}
