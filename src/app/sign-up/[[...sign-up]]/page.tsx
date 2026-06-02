import { SignUp } from "@clerk/nextjs";

export default function SignUpPage(){
    return (
        <div className="w-full flex items-center justify-center bg-background">
            <SignUp
                appearance={{
                    elements: {
                        rootBox: "mx-auto",
                        card: "shadow-lg"
                    }
                }}
            />
        </div>
    )
}