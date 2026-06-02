import { SignIn } from "@clerk/nextjs";

export default function SignInPage(){
    return (
        <div className="w-full flex items-center justify-center bg-background">
            <SignIn
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