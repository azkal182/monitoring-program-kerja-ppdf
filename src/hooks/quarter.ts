import { Prisma } from "@/generated/prisma/client";
import { QuarterInput } from "@/lib/validations/quarter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type quarter = Prisma.QuarterGetPayload<{}>;

export async function fetchQuarters(): Promise<quarter[]> {
  const res = await fetch("/api/quarters");

  if (!res.ok) {
    let message = "Failed to fetch quarters";

    try {
      const error = await res.json();
      message = error?.error ?? message;
    } catch {
      // ignore parsing error
    }

    throw new Error(message);
  }

  return (await res.json()) as quarter[];
}

async function createQuarter(data: QuarterInput): Promise<quarter> {
  const res = await fetch("/api/quarters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create quarter");
  }
  return res.json();
}

export const useQuarter = () => {
  return useQuery({
    queryKey: ["quarters"],
    queryFn: fetchQuarters,
  });
};

export const useCreateQuarter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createQuarter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quarters"] });
    },
  });
};
