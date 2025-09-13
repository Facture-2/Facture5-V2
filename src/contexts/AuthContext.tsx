import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db, googleProvider } from '../config/firebase';
import { ManagedUser } from './UserManagementContext';

interface Company {
  name: string;
  ice: string;
  if: string;
  rc: string;
  cnss: string;
  address: string;
  phone: string;
  email: string;
  patente: string;
  website: string;
  logo?: string;
  signature?: string;
  invoiceNumberingFormat?: string;
  invoicePrefix?: string;
  invoiceCounter?: number;
  lastInvoiceYear?: number;
  defaultTemplate?: string;
  subscription?: 'free' | 'pro';
  subscriptionDate?: string;
  expiryDate?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  isAdmin: boolean;
  entrepriseId?: string;
  permissions?: {
    dashboard: boolean;
    invoices: boolean;
    quotes: boolean;
    clients: boolean;
    products: boolean;
    suppliers: boolean;
    stockManagement: boolean;
    supplierManagement: boolean;
    hrManagement: boolean;
    reports: boolean;
    settings: boolean;
    projectManagement: boolean;
  };
  company: Company;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  register: (email: string, password: string, companyData: Company) => Promise<boolean>;
  registerWithGoogle: (companyData: Company) => Promise<boolean>;
  sendEmailVerification: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  upgradeSubscription: () => Promise<void>;
  updateCompanySettings: (settings: Partial<Company>) => Promise<void>;
  checkSubscriptionExpiry: () => Promise<void>;
  isLoading: boolean;
  showExpiryAlert: boolean;
  setShowExpiryAlert: (show: boolean) => void;
  expiredDate: string | null;
  subscriptionStatus: {
    isExpired: boolean;
    isExpiringSoon: boolean;
    daysRemaining: number;
    shouldBlockUsers: boolean;
    shouldShowNotification: boolean;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showExpiryAlert, setShowExpiryAlert] = useState(false);
  const [expiredDate, setExpiredDate] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    isExpired: false,
    isExpiringSoon: false,
    daysRemaining: 0,
    shouldBlockUsers: false,
    shouldShowNotification: false
  });

  // Fonction pour calculer le statut de l'abonnement
  const calculateSubscriptionStatus = (userData: any) => {
    if (userData.subscription !== 'pro' || !userData.expiryDate) {
      return {
        isExpired: false,
        isExpiringSoon: false,
        daysRemaining: 0,
        shouldBlockUsers: false,
        shouldShowNotification: false
      };
    }

    const currentDate = new Date();
    const expiry = new Date(userData.expiryDate);
    const timeDiff = expiry.getTime() - currentDate.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    const isExpired = daysRemaining <= 0;
    const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 5;
    const shouldBlockUsers = isExpired;
    const shouldShowNotification = isExpiringSoon && !isExpired;

    return {
      isExpired,
      isExpiringSoon,
      daysRemaining: Math.max(0, daysRemaining),
      shouldBlockUsers,
      shouldShowNotification
    };
  };

  // Vérification utilisateur géré
  const checkManagedUser = async (email: string, password: string): Promise<ManagedUser | null> => {
    try {
      const managedUsersQuery = query(
        collection(db, 'managedUsers'),
        where('email', '==', email),
        where('password', '==', password),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(managedUsersQuery);
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data() as ManagedUser;
        return {
          id: snapshot.docs[0].id,
          ...userData
        };
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'utilisateur géré:', error);
      return null;
    }
  };

  const checkSubscriptionExpiry = async (userId: string, userData: any) => {
    if (userData.subscription === 'pro' && userData.expiryDate) {
      const currentDate = new Date();
      const expiryDate = new Date(userData.expiryDate);
      
      if (currentDate > expiryDate) {
        try {
          await updateDoc(doc(db, 'entreprises', userId), {
            subscription: 'free',
            subscriptionDate: new Date().toISOString(),
            expiryDate: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          
          setUser(prevUser => {
            if (prevUser) {
              return {
                ...prevUser,
                company: {
                  ...prevUser.company,
                  subscription: 'free',
                  subscriptionDate: new Date().toISOString(),
                  expiryDate: new Date().toISOString()
                }
              };
            }
            return prevUser;
          });
          
          setExpiredDate(userData.expiryDate);
          setShowExpiryAlert(true);
        } catch (error) {
          console.error('Erreur lors de la mise à jour de l\'expiration:', error);
        }
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setFirebaseUser(firebaseUser);
        try {
          const userDoc = await getDoc(doc(db, 'entreprises', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              id: firebaseUser.uid,
              name: userData.ownerName || firebaseUser.email?.split('@')[0] || 'Utilisateur',
              email: firebaseUser.email || '',
              role: 'admin',
              isAdmin: true,
              entrepriseId: firebaseUser.uid,
              company: {
                name: userData.name,
                ice: userData.ice,
                if: userData.if,
                rc: userData.rc,
                cnss: userData.cnss,
                address: userData.address,
                phone: userData.phone,
                logo: userData.logo,
                email: userData.email,
                signature: userData.signature || "",
                patente: userData.patente,
                website: userData.website,
                invoiceNumberingFormat: userData.invoiceNumberingFormat,
                invoicePrefix: userData.invoicePrefix,
                invoiceCounter: userData.invoiceCounter,
                lastInvoiceYear: userData.lastInvoiceYear,
                defaultTemplate: userData.defaultTemplate || 'template1',
                subscription: userData.subscription || 'free',
                subscriptionDate: userData.subscriptionDate,
                expiryDate: userData.expiryDate
              }
            });

            const status = calculateSubscriptionStatus(userData);
            setSubscriptionStatus(status);
            await checkSubscriptionExpiry(firebaseUser.uid, userData);
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des données utilisateur:', error);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      if (email === 'admin@facture.ma' && password === 'Rahma1211?') {
        setUser({
          id: 'facture-admin',
          name: 'Administrateur Facture.ma',
          email: 'admin@facture.ma',
          role: 'admin',
          isAdmin: true,
          company: {
            name: 'Facture.ma',
            ice: '',
            if: '',
            rc: '',
            cnss: '',
            address: '',
            phone: '',
            email: 'admin@facture.ma',
            patente: '',
            website: '',
            subscription: 'pro'
          }
        });
        return true;
      }

      const managedUser = await checkManagedUser(email, password);
      if (managedUser) {
        const companyDoc = await getDoc(doc(db, 'entreprises', managedUser.entrepriseId));
        if (companyDoc.exists()) {
          const companyData = companyDoc.data();
          const status = calculateSubscriptionStatus(companyData);
          if (status.shouldBlockUsers || (companyData.subscription !== 'pro')) {
            throw new Error('ACCOUNT_BLOCKED_EXPIRED');
          }
          await updateDoc(doc(db, 'managedUsers', managedUser.id), {
            lastLogin: new Date().toISOString()
          });
          setUser({
            id: managedUser.id,
            name: managedUser.name,
            email: managedUser.email,
            role: 'user',
            isAdmin: false,
            permissions: managedUser.permissions,
            entrepriseId: managedUser.entrepriseId,
            company: {
              name: companyData.name,
              ice: companyData.ice,
              if: companyData.if,
              rc: companyData.rc,
              cnss: companyData.cnss,
              address: companyData.address,
              phone: companyData.phone,
              logo: companyData.logo,
              email: companyData.email,
              signature: companyData.signature || "",
              patente: companyData.patente,
              website: companyData.website,
              invoiceNumberingFormat: companyData.invoiceNumberingFormat,
              invoicePrefix: companyData.invoicePrefix,
              invoiceCounter: companyData.invoiceCounter,
              lastInvoiceYear: companyData.lastInvoiceYear,
              defaultTemplate: companyData.defaultTemplate || 'template1',
              subscription: companyData.subscription || 'free',
              subscriptionDate: companyData.subscriptionDate,
              expiryDate: companyData.expiryDate
            }
          });
          setSubscriptionStatus(status);
          return true;
        }
        return false;
      }

      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error) {
      console.error('Erreur de connexion:', error);
      return false;
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      const userDoc = await getDoc(doc(db, 'entreprises', firebaseUser.uid));
      if (!userDoc.exists()) {
        const defaultCompanyData = {
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Mon Entreprise',
          ice: '',
          if: '',
          rc: '',
          cnss: '',
          address: '',
          phone: '',
          email: firebaseUser.email || '',
          patente: '',
          website: '',
          logo: firebaseUser.photoURL || '',
          ownerEmail: firebaseUser.email,
          ownerName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Utilisateur',
          emailVerified: firebaseUser.emailVerified,
          subscription: 'free',
          subscriptionDate: new Date().toISOString(),
          expiryDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'entreprises', firebaseUser.uid), defaultCompanyData);
      }

      return true;
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, googleProvider);
        return false;
      }
      console.error('Erreur de connexion Google:', error);
      throw error;
    }
  };

  const registerWithGoogle = async (companyData: Company): Promise<boolean> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      await setDoc(doc(db, 'entreprises', firebaseUser.uid), {
        ...companyData,
        ownerEmail: firebaseUser.email,
        ownerName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Utilisateur',
        emailVerified: firebaseUser.emailVerified,
        subscription: 'free',
        subscriptionDate: new Date().toISOString(),
        expiryDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Erreur lors de l\'inscription Google:', error);
      return false;
    }
  };

  const register = async (email: string, password: string, companyData: Company): Promise<boolean> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;
      await sendEmailVerification(userCredential.user);

      await setDoc(doc(db, 'entreprises', userId), {
        ...companyData,
        ownerEmail: email,
        ownerName: email.split('@')[0],
        emailVerified: false,
        subscription: 'free',
        subscriptionDate: new Date().toISOString(),
        expiryDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      return false;
    }
  };

  const sendEmailVerificationManual = async (): Promise<void> => {
    if (!firebaseUser) throw new Error('Aucun utilisateur connecté');
    try {
      await sendEmailVerification(firebaseUser);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email de vérification:', error);
      throw error;
    }
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email de réinitialisation:', error);
      throw error;
    }
  };

  const upgradeSubscription = async (): Promise<void> => {
    if (!user) return;
    try {
      const currentDate = new Date();
      const expiryDate = new Date();
      expiryDate.setDate(currentDate.getDate() + 30);
      await updateDoc(doc(db, 'entreprises', user.id), {
        subscription: 'pro',
        subscriptionDate: currentDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        updatedAt: new Date().toISOString()
      });
      setUser(prevUser => {
        if (prevUser) {
          return {
            ...prevUser,
            company: {
              ...prevUser.company,
              subscription: 'pro',
              subscriptionDate: currentDate.toISOString(),
              expiryDate: expiryDate.toISOString()
            }
          };
        }
        return prevUser;
      });
    } catch (error) {
      console.error('Erreur lors de la mise à niveau:', error);
      throw error;
    }
  };

  const updateCompanySettings = async (settings: Partial<Company>): Promise<void> => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'entreprises', user.id), {
        ...settings,
        updatedAt: new Date().toISOString()
      });
      setUser(prevUser => {
        if (prevUser) {
          return {
            ...prevUser,
            company: {
              ...prevUser.company,
              ...settings
            }
          };
        }
        return prevUser;
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour des paramètres:', error);
      throw error;
    }
  };

  const checkSubscriptionExpiryManual = async (): Promise<void> => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, 'entreprises', user.id));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        await checkSubscriptionExpiry(user.id, userData);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'expiration:', error);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (user && !user.isAdmin) {
        setUser(null);
        setFirebaseUser(null);
      } else {
        await signOut(auth);
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const value = {
    user,
    firebaseUser,
    isAuthenticated: !!user,
    login,
    loginWithGoogle,
    register,
    registerWithGoogle,
    sendEmailVerification: sendEmailVerificationManual,
    sendPasswordReset,
    logout,
    upgradeSubscription,
    updateCompanySettings,
    checkSubscriptionExpiry: checkSubscriptionExpiryManual,
    isLoading,
    showExpiryAlert,
    setShowExpiryAlert,
    expiredDate,
    subscriptionStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
