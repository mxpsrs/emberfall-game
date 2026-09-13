import com.android.apksig.ApkSigner;
import com.android.apksig.ApkVerifier;
import java.io.*;
import java.nio.file.*;
import java.security.*;
import java.security.cert.X509Certificate;
import java.util.*;

public final class SignApk {
  public static void main(String[] args) throws Exception {
    if (args[0].equals("verify")) {
      ApkVerifier.Result result = new ApkVerifier.Builder(new File(args[1])).setMinCheckedPlatformVersion(26).build().verify();
      if (!result.isVerified()) throw new IllegalStateException("Signature verification failed: " + result.getErrors());
      System.out.println("Verified APK: v1=" + result.isVerifiedUsingV1Scheme() + ", v2=" + result.isVerifiedUsingV2Scheme() + ", v3=" + result.isVerifiedUsingV3Scheme());
      byte[] hash = MessageDigest.getInstance("SHA-256").digest(result.getSignerCertificates().get(0).getEncoded());
      StringBuilder hex = new StringBuilder(); for (byte b : hash) hex.append(String.format("%02x", b));
      System.out.println("Signing certificate SHA-256: " + hex);
      return;
    }
    char[] password = Files.readString(Path.of(args[3])).trim().toCharArray();
    KeyStore store = KeyStore.getInstance("PKCS12");
    try (InputStream input = new FileInputStream(args[2])) { store.load(input, password); }
    PrivateKey key = (PrivateKey) store.getKey("emberfall-beta", password);
    List<X509Certificate> chain = new ArrayList<>();
    for (java.security.cert.Certificate cert : store.getCertificateChain("emberfall-beta")) chain.add((X509Certificate) cert);
    ApkSigner.SignerConfig config = new ApkSigner.SignerConfig.Builder("emberfall-beta", key, chain).build();
    new ApkSigner.Builder(List.of(config)).setInputApk(new File(args[0])).setOutputApk(new File(args[1])).setMinSdkVersion(26).setV1SigningEnabled(true).setV2SigningEnabled(true).setV3SigningEnabled(true).build().sign();
    Arrays.fill(password, '\0');
    System.out.println("APK signed.");
  }
}
