import { AxiosError, isAxiosError } from 'axios'

export const errorConstructor = (error: unknown) => {
  let errorMessage

  if (isAxiosError(error)) {
    console.log('error message: ', (error as AxiosError).message)
    if ((error as AxiosError).response?.status == 401) {
      errorMessage =
        'Произошла ошибка при отправке. Неверный токен. Попробуйте обновить страницу'
    } else if ((error as AxiosError).response?.status == 429) {
      errorMessage =
        'Слишком много запросов с вашего адреса. Повторите попытку позже.'
    } else if ((error as AxiosError).response?.status == 400) {
      errorMessage = 'Некорректный запрос. Проверьте введённые данные.'
    } else if ((error as AxiosError).response?.status == 423) {
      errorMessage =
        'Произошла ошибка при отправке. Ошибка доступа к базе данных. Попробуйте позже'
    } else if ((error as AxiosError).response?.status == 535) {
      errorMessage = 'Произошла ошибка при отправке письма. Попробуйте позже'
    } else {
      errorMessage = 'Произошла ошибка при отправке. Попробуйте позже'
    }
  } else {
    console.log('unexpected error: ', error)
    errorMessage = 'Произошла непредвиденная ошибка. Попробуйте позже'
  }

  return errorMessage
}
