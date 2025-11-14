export interface Vendor {
  id: string
  name: string
  email: string
  password: string
  active: boolean
}

export const vendors: Vendor[] = [
  {
    id: "1",
    name: "Oxslin",
    email: "oxsportshop@gmail.com",
    password: "password123",
    active: true,
  },
  {
    id: "2",
    name: "Vendor 2",
    email: "vendor2@example.com",
    password: "password2",
    active: false,
  },
]

