import ApiError from "../middlewares/ApiError";

export const parseDDMMYYYY = (value: string): Date => {
  const [day, month, year] = value.split("-").map(Number);

  if (!day || !month || !year) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Date must be in DD-MM-YYYY format");
  }

  const date = new Date(year, month - 1, day);

  if (isNaN(date.getTime())) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid date value");
  }

  return date;
};
