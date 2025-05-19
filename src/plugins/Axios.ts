import axios from 'axios'

const axiosInstance = axios.create({
    baseURL: 'https://api.telegram.org',
    headers: {
        "Content-Type": "application/json"
    }
})

export default axiosInstance