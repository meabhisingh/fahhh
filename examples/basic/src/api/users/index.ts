import type { ApiRequest } from "fahhh";

interface CreateUserBody {
  name: string;
}

const users = [
  { id: "1", name: "Angena Ghatram" },
  { id: "2", name: "Naine Vaktram" },
];

export async function GET() {
  return users;
}

export async function POST(req: ApiRequest<CreateUserBody>) {
  const body = await req.json();

  const user = {
    id: String(users.length + 1),
    name: body.name,
  };

  users.push(user);
  return user;
}
